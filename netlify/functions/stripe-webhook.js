const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// This webhook endpoint will be called by Stripe when payment events occur
exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify the webhook signature
    if (webhookSecret) {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        sig,
        webhookSecret
      );
    } else {
      // For testing without webhook secret (not recommended for production)
      stripeEvent = JSON.parse(event.body);
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` }),
    };
  }

  // Handle the event
  try {
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(stripeEvent.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(stripeEvent.data.object);
        break;
        
      default:
        console.log(`Unhandled event type ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };

  } catch (error) {
    console.error('Webhook processing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed' }),
    };
  }
};

async function handlePaymentSuccess(paymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);
  
  // Extract metadata
  const { program, lessons } = paymentIntent.metadata;
  
  // Find the package by payment intent ID
  const { data: packageData, error: findError } = await supabase
    .from('packages')
    .select('*')
    .eq('payment_intent_id', paymentIntent.id)
    .single();

  if (findError || !packageData) {
    console.error('Package not found for payment intent:', paymentIntent.id);
    return;
  }

  // Update package status to paid
  const { error: updateError } = await supabase
    .from('packages')
    .update({ 
      status: 'paid',
      updated_at: new Date().toISOString()
    })
    .eq('id', packageData.id);

  if (updateError) {
    console.error('Failed to update package status:', updateError);
    return;
  }

  // Extract customer email from payment intent if available
  if (paymentIntent.receipt_email || paymentIntent.charges?.data[0]?.billing_details?.email) {
    const customerEmail = paymentIntent.receipt_email || paymentIntent.charges.data[0].billing_details.email;
    const customerName = paymentIntent.charges?.data[0]?.billing_details?.name || '';
    const customerPhone = paymentIntent.charges?.data[0]?.billing_details?.phone || '';
    
    // Update package with customer info
    await supabase
      .from('packages')
      .update({ 
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone
      })
      .eq('id', packageData.id);
    
    // Create or update customer record
    await supabase
      .from('customers')
      .upsert([
        {
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'email' });
  }

  console.log(`Package ${packageData.code} marked as paid`);
  
  // Send confirmation email with package code
  await sendPackageConfirmationEmail(packageData, paymentIntent);
}

async function handlePaymentFailure(paymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  
  // Find and update the package
  const { error } = await supabase
    .from('packages')
    .update({ 
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('Failed to update package status:', error);
  }
}

// Function to send package confirmation email
async function sendPackageConfirmationEmail(packageData, paymentIntent) {
  try {
    // Get email from package data or payment intent
    const customerEmail = packageData.customer_email || 
                          paymentIntent.metadata.customerEmail || 
                          paymentIntent.receipt_email || 
                          paymentIntent.charges?.data[0]?.billing_details?.email;
    
    if (!customerEmail) {
      console.log('No email found for package confirmation');
      return;
    }
    
    console.log(`Sending package code to: ${customerEmail}`);
    
    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .header { background-color: #2284B8; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; max-width: 600px; margin: 0 auto; }
          .package-code { background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .package-code-value { font-size: 28px; font-weight: bold; color: #2284B8; letter-spacing: 2px; margin: 10px 0; }
          .details { background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .details p { margin: 8px 0; }
          .button { background-color: #2284B8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; color: #666; padding: 20px; font-size: 12px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SafeStroke Swim Academy</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">Package Purchase Confirmation</p>
        </div>
        
        <div class="content">
          <p>Thank you for your purchase!</p>
          
          <div class="package-code">
            <p style="margin: 0; font-size: 16px;">Your Package Code:</p>
            <div class="package-code-value">${packageData.code}</div>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Save this code - you'll need it to book your lessons!</p>
          </div>
          
          <div class="details">
            <h3 style="color: #2284B8; margin-top: 0;">Package Details:</h3>
            <p><strong>Program:</strong> ${packageData.program}</p>
            <p><strong>Total Lessons:</strong> ${packageData.lessons_total}</p>
            <p><strong>Amount Paid:</strong> ${packageData.amount_paid}</p>
          </div>
          
          <h3>Next Steps:</h3>
          <ol>
            <li>Save this email with your package code</li>
            <li>Visit our booking page: <a href="https://safestrokeswim.com/safestroke-booking.html">Book Your Lessons</a></li>
            <li>Enter your package code to schedule your lessons</li>
          </ol>
          
          <div style="text-align: center;">
            <a href="https://safestrokeswim.com/safestroke-booking.html" class="button">Book Your Lessons Now</a>
          </div>
          
          <p>If you have any questions, please don't hesitate to contact us at 973-820-1153.</p>
          
          <p>Best regards,<br>
          The SafeStroke Team</p>
        </div>
        
        <div class="footer">
          <p>SafeStroke Swim Academy<br>
          199 Scoles Avenue, Clifton, NJ 07012<br>
          Phone: 973-820-1153</p>
          <p>© 2025 SafeStroke Swim Academy. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
    
    // Send the email
    await sgMail.send({
      to: customerEmail,
      from: 'contact@safestrokeswim.com',
      subject: `Your SafeStroke Package Code: ${packageData.code}`,
      html: emailHtml,
    });
    
    console.log(`Package confirmation email sent to ${customerEmail}`);
    
  } catch (error) {
    console.error('Failed to send package confirmation email:', error);
    // Don't throw - we don't want to fail the webhook if email fails
  }
}