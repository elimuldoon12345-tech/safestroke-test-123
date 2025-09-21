const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send booking confirmation emails
 */
async function sendBookingConfirmation(bookingData, slotData) {
  // Format the date and time
  const bookingDate = new Date(slotData.date);
  const formattedDate = bookingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const formattedTime = formatTime(slotData.start_time);
  const formattedEndTime = formatTime(slotData.end_time);
  
  // Customer email HTML
  const customerEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .header { background-color: #2284B8; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; max-width: 600px; margin: 0 auto; }
        .details { background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .details p { margin: 8px 0; }
        .button { background-color: #2284B8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; color: #666; padding: 20px; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SafeStroke Swim Academy</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Booking Confirmation</p>
      </div>
      
      <div class="content">
        <p>Dear ${bookingData.customer_name},</p>
        
        <p>Thank you for booking with SafeStroke Swim Academy! Your lesson has been confirmed.</p>
        
        <div class="details">
          <h3 style="color: #2284B8; margin-top: 0;">Booking Details:</h3>
          <p><strong>Booking ID:</strong> #${bookingData.id}</p>
          <p><strong>Student Name:</strong> ${bookingData.student_name}</p>
          <p><strong>Program:</strong> ${slotData.program}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime} - ${formattedEndTime}</p>
          <p><strong>Location:</strong> 199 Scoles Avenue, Clifton, NJ 07012</p>
          ${bookingData.notes ? `<p><strong>Special Notes:</strong> ${bookingData.notes}</p>` : ''}
        </div>
        
        <h3>What to Bring:</h3>
        <ul>
          <li>Swimsuit and towel</li>
          <li>Goggles (optional but recommended)</li>
          <li>Water bottle</li>
          <li>Positive attitude!</li>
        </ul>
        
        <h3>Important Reminders:</h3>
        <ul>
          <li>Please arrive 10 minutes early for check-in</li>
          <li>If you need to cancel or reschedule, please call us at least 24 hours in advance</li>
          <li>Parents are welcome to observe from the viewing area</li>
        </ul>
        
        <div style="text-align: center;">
          <a href="tel:973-820-1153" class="button">Call Us: 973-820-1153</a>
        </div>
        
        <p>We look forward to seeing you at the pool!</p>
        
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
  
  // Business notification email HTML
  const businessEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .header { background-color: #00253D; color: white; padding: 20px; }
        .content { padding: 20px; }
        .details { background-color: #f0f9ff; padding: 15px; border-left: 4px solid #2284B8; margin: 15px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        td:first-child { font-weight: bold; width: 150px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>New Booking Notification</h2>
      </div>
      
      <div class="content">
        <div class="details">
          <h3>New booking received!</h3>
        </div>
        
        <table>
          <tr><td>Booking ID:</td><td>#${bookingData.id}</td></tr>
          <tr><td>Date & Time:</td><td>${formattedDate} at ${formattedTime}</td></tr>
          <tr><td>Program:</td><td>${slotData.program}</td></tr>
        </table>
        
        <h3>Student Information:</h3>
        <table>
          <tr><td>Student Name:</td><td>${bookingData.student_name}</td></tr>
        </table>
        
        <h3>Parent/Guardian Information:</h3>
        <table>
          <tr><td>Name:</td><td>${bookingData.customer_name}</td></tr>
          <tr><td>Email:</td><td>${bookingData.customer_email}</td></tr>
          <tr><td>Phone:</td><td>${bookingData.customer_phone || 'Not provided'}</td></tr>
        </table>
        
        ${bookingData.notes ? `
        <h3>Special Notes:</h3>
        <div class="details">
          <p>${bookingData.notes}</p>
        </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
  
  try {
    // Send customer email
    await sgMail.send({
      to: bookingData.customer_email,
      from: 'contact@safestrokeswim.com', // Verified SendGrid sender email
      subject: `Booking Confirmed - ${formattedDate} at ${formattedTime}`,
      html: customerEmailHtml,
    });
    
    // Send business notification
    await sgMail.send({
      to: 'contact@safestrokeswim.com', // Business notification email
      from: 'contact@safestrokeswim.com', // Verified SendGrid sender email
      subject: `New Booking: ${bookingData.student_name} - ${formattedDate}`,
      html: businessEmailHtml,
    });
    
    console.log('Booking confirmation emails sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending emails:', error);
    // Don't fail the booking if email fails
    return { success: false, error: error.message };
  }
}

// Helper function to format time
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

module.exports = {
  sendBookingConfirmation
};