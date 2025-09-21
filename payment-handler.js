// Stripe payment integration for SafeStroke packages
// This handles the payment process on your website
// Note: stripe and elements variables are declared in booking-logic.js

// Initialize Stripe (you'll need to get your own public key)
function initializeStripe() {
    // Replace 'pk_test_...' with your actual Stripe public key
    if (typeof window.stripe === 'undefined') {
        window.stripe = Stripe('pk_test_YOUR_STRIPE_PUBLIC_KEY_HERE');
        window.elements = window.stripe.elements();
    }
}

// Set up the payment form
function setupPaymentForm(packageInfo) {
    selectedPackage = packageInfo;
    
    const paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');
    
    // Show payment section
    document.getElementById('payment-section').classList.remove('hidden');
    document.getElementById('package-selection').classList.add('hidden');
    
    // Update payment summary
    document.getElementById('payment-summary').innerHTML = `
        <h3 class="text-xl font-bold mb-4">Payment Summary</h3>
        <div class="bg-gray-50 p-4 rounded-lg">
            <p><strong>Program:</strong> ${packageInfo.program}</p>
            <p><strong>Package:</strong> ${packageInfo.lessons} lessons</p>
            <p><strong>Total:</strong> $${packageInfo.price}</p>
        </div>
    `;
}

// Process the payment
async function processPayment() {
    const submitButton = document.getElementById('pay-button');
    submitButton.textContent = 'Processing...';
    submitButton.disabled = true;

    try {
        // Create payment intent on your server
        const response = await fetch('/.netlify/functions/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: selectedPackage.price * 100, // Stripe uses cents
                program: selectedPackage.program,
                lessons: selectedPackage.lessons
            })
        });
        
        const { clientSecret, packageCode } = await response.json();
        
        // Confirm payment with Stripe
        const result = await stripe.confirmPayment({
            elements,
            clientSecret,
            confirmParams: {
                return_url: window.location.origin + '/payment-success.html'
            },
            redirect: 'if_required'
        });
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
        // Payment successful - show the package code
        showPaymentSuccess(packageCode);
        
    } catch (error) {
        console.error('Payment failed:', error);
        alert('Payment failed: ' + error.message);
        submitButton.textContent = 'Pay Now';
        submitButton.disabled = false;
    }
}

// Show success message with package code
function showPaymentSuccess(packageCode) {
    document.getElementById('payment-section').classList.add('hidden');
    document.getElementById('success-section').classList.remove('hidden');
    
    document.getElementById('package-code-display').textContent = packageCode;
    
    // Auto-fill the booking form with the new code
    const codeInput = document.getElementById('package-code-input');
    if (codeInput) {
        codeInput.value = packageCode;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Stripe !== 'undefined') {
        initializeStripe();
    }
});
