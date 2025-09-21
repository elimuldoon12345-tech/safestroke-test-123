// --- Static Data ---
const ACUITY_PACKAGE_IDS = {
    'Droplet': { 4: 2023668, 6: 2023671, 8: 2023672 },
    'Splashlet': { 4: 2023669, 6: 2023673, 8: 2023674 },
    'Strokelet': { 4: 2023670, 6: 2023676, 8: 2023677 },
};

const ACUITY_APPOINTMENT_TYPE_IDS = {
    'Droplet': 81908979,
    'Splashlet': 81908997,
    'Strokelet': 81909020,
};

// Package pricing (in dollars)
const PACKAGE_PRICING = {
    'Droplet': { 4: 112, 6: 162, 8: 200 },
    'Splashlet': { 4: 152, 6: 222, 8: 280 },
    'Strokelet': { 4: 172, 6: 252, 8: 320 },
};

const ACUITY_OWNER_ID = '36567436';

// --- Global State Variables ---
let selectedProgramName = null;
let selectedAppointmentTypeID = null;
let enteredPackageCode = null;
let selectedPackage = null;

// Payment system
let stripe;
let elements;
let paymentElement;

// --- Main Initializer ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("SafeStroke Booking Logic Initialized.");
    initializeMobileMenu();
    initializeBookingFlow();
    initializePaymentSystem();
    testNetlifyFunction();
});

// Test function to make sure Netlify functions are working
async function testNetlifyFunction() {
    try {
        console.log('Testing Netlify function accessibility...');
        const response = await fetch('/.netlify/functions/create-payment', {
            method: 'OPTIONS'
        });
        console.log('Netlify function test response:', response.status);
        if (response.status === 200) {
            console.log('✓ Netlify functions are accessible');
        } else {
            console.warn('⚠ Netlify function returned status:', response.status);
        }
    } catch (error) {
        console.error('✗ Netlify function test failed:', error);
        console.error('Make sure your site is deployed and functions are working');
    }
}

// --- Initializer Functions ---
function initializeMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

function initializeBookingFlow() {
    console.log("Initializing booking flow listeners...");

    const programCards = document.querySelectorAll('#step-1 .step-card');
    if (programCards.length > 0) {
        console.log(`Found ${programCards.length} program cards. Attaching listeners...`);
        programCards.forEach(card => {
            card.addEventListener('click', handleProgramSelection);
        });
    } else {
        console.error("CRITICAL: Could not find any program cards to attach listeners to.");
    }

    const backButton = document.getElementById('back-to-programs');
    if (backButton) {
        backButton.addEventListener('click', handleGoBackToPrograms);
    }

    const backToPackagesButton = document.getElementById('back-to-packages');
    if (backToPackagesButton) {
        backToPackagesButton.addEventListener('click', handleBackToPackages);
    }

    const scheduleButton = document.getElementById('schedule-with-code-btn');
    if (scheduleButton) {
        scheduleButton.addEventListener('click', handleScheduleWithCode);
    }

    const bookNowButton = document.getElementById('book-now-btn');
    if (bookNowButton) {
        bookNowButton.addEventListener('click', handleBookNowAfterPayment);
    }
}

function initializePaymentSystem() {
    // Stripe public key - You need to replace this with your actual Stripe publishable key
    const stripePublicKey = 'pk_test_51S4UnDPRIIfaJZnp1eF8ZlFCD74YDhIU0LVsu3oX3RAy58FBARnucYobBFWf2Wr0wBTZ7smsb1br4ySd2PcfZN4m00oGXz5yQn'; 
    
    console.log('Initializing payment system...');
    console.log('Stripe key (first 20 chars):', stripePublicKey.substring(0, 20));
    
    // Validate Stripe key format
    if (!stripePublicKey.startsWith('pk_')) {
        console.error('Invalid Stripe publishable key format - must start with pk_');
        alert('Payment system configuration error. Please contact support.');
        return;
    }
    
    if (typeof Stripe !== 'undefined') {
        try {
            stripe = Stripe(stripePublicKey);
            console.log('Stripe initialized successfully with key:', stripePublicKey.substring(0, 12) + '...');
            console.log('Stripe instance:', stripe);
        } catch (error) {
            console.error('Failed to initialize Stripe:', error);
            alert('Payment system initialization failed: ' + error.message);
        }
    } else {
        console.error('Stripe library not loaded. Make sure the Stripe script tag is in the HTML.');
        alert('Payment system not available. Stripe library not loaded.');
    }
}

// --- Event Handler Functions ---
function handleProgramSelection(event) {
    selectedProgramName = event.currentTarget.dataset.programName;
    console.log(`Program selected: ${selectedProgramName}`);
    goToStep2();
}

function handleGoBackToPrograms() {
    showSection('step-1');
    updateStepIndicators(1);
    console.log("Returned to program selection.");
}

function handleBackToPackages() {
    showSection('step-2');
    updateStepIndicators(2);
    console.log("Returned to package selection.");
}

function handleBookNowAfterPayment() {
    // Auto-fill the code and trigger scheduling
    const codeInput = document.getElementById('package-code-input');
    const packageCode = document.getElementById('package-code-display').textContent;
    
    if (codeInput && packageCode) {
        codeInput.value = packageCode;
        handleScheduleWithCode();
    }
}

async function handleScheduleWithCode() {
    const codeInput = document.getElementById('package-code-input');
    const code = codeInput.value.trim();
    const codeError = document.getElementById('code-error-message');
    const calendarLoading = document.getElementById('calendar-loading');

    if (!code) {
        codeError.textContent = "Please enter a code.";
        codeError.classList.remove('hidden');
        return;
    }
    codeError.classList.add('hidden');

    showSection('calendar-section');
    document.getElementById('existing-customer-path').classList.add('hidden');
    document.getElementById('new-customer-path').classList.add('hidden');
    document.getElementById('calendar-title').textContent = `Schedule with code: ${code}`;
    calendarLoading.classList.remove('hidden');
    document.getElementById('calendar-container').classList.add('hidden');

    try {
        // Validate the package code with the backend - with retry logic for webhook delay
        let data = null;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            const response = await fetch(`/.netlify/functions/validate-package?code=${code}`);
            data = await response.json();
            
            if (response.ok && data.valid) {
                break; // Success!
            }
            
            // If this is from a recent payment, wait and retry
            if (window.currentPackageCode === code && attempts < maxAttempts - 1) {
                console.log(`Package validation attempt ${attempts + 1} failed, webhook may be pending. Retrying...`);
                // Update loading message to show we're waiting for payment confirmation
                calendarLoading.innerHTML = `
                    <p class="text-lg text-gray-600">Waiting for payment confirmation...</p>
                    <p class="text-sm text-gray-500 mt-2">This may take a few seconds. Attempt ${attempts + 1} of ${maxAttempts}</p>
                `;
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                attempts++;
            } else {
                throw new Error(data.error || 'Invalid package code');
            }
        }
        
        if (!data || !data.valid) {
            throw new Error('Package validation failed after multiple attempts');
        }
        
        selectedAppointmentTypeID = data.appointmentTypeID;
        enteredPackageCode = code;
        
        // Store customer info if available
        if (data.customer) {
            window.customerInfo = data.customer;
        }

        console.log(`Code valid. Program: ${data.program}, Remaining: ${data.lessons_remaining}/${data.lessons_total}`);
        
        // Show remaining lessons
        document.getElementById('calendar-title').textContent = 
            `Schedule with code: ${code} (${data.lessons_remaining} lessons remaining)`;
        
        // Reset loading message
        calendarLoading.innerHTML = `<p class="text-lg text-gray-600">Loading available times...</p>`;
        
        // Fetch available classes from backend
        const classesResponse = await fetch(`/.netlify/functions/book-class?program=${data.program}`);
        const classes = await classesResponse.json();
        
        renderCalendar(classes);
    } catch (error) {
        console.error('Code validation or date fetching failed:', error);
        codeInput.value = '';
        document.getElementById('existing-customer-path').classList.remove('hidden');
        document.getElementById('new-customer-path').classList.remove('hidden');
        showSection(null);
        codeError.textContent = error.message || "This code is not valid or has no remaining lessons. Please try another.";
        codeError.classList.remove('hidden');
    }
}

function handlePackageSelection(programName, lessons, price) {
    selectedPackage = {
        program: programName,
        lessons: lessons,
        price: price
    };
    
    console.log(`Package selected:`, selectedPackage);
    goToPayment();
}

// --- UI Rendering & State Management ---
function goToStep2() {
    showSection('step-2');
    updateStepIndicators(2);
    renderPackageCards(selectedProgramName);
}

function goToPayment() {
    showSection('payment-section');
    updateStepIndicators(3);
    setupPaymentForm();
}

function updateStepIndicators(activeStep) {
    const indicators = ['step-1-indicator', 'step-2-indicator', 'step-3-indicator', 'step-4-indicator'];
    
    indicators.forEach((id, index) => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('active', 'completed');
            
            if (index + 1 < activeStep) {
                element.classList.add('completed');
            } else if (index + 1 === activeStep) {
                element.classList.add('active');
            } else {
                // Future steps remain gray
            }
        }
    });
}

function renderPackageCards(programName) {
    console.log(`Rendering package cards for: ${programName}`);
    const packages = ACUITY_PACKAGE_IDS[programName];
    const pricing = PACKAGE_PRICING[programName];
    const container = document.getElementById('package-container');

    container.innerHTML = `
        <div class="package-card bg-white p-8 rounded-xl shadow-lg border-2 border-transparent hover:border-blue-500 cursor-pointer transition duration-300" data-lessons="4">
            <h4 class="text-2xl font-bold">4-Lesson Package</h4>
            <p class="text-lg font-semibold brand-blue my-2">Popular Choice</p>
            <p class="text-3xl font-bold mb-4">$${pricing[4]}</p>
            <button class="purchase-btn mt-4 w-full brand-blue-bg hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full text-lg transition duration-300" data-lessons="4" data-price="${pricing[4]}">
                Purchase Now
            </button>
        </div>
        <div class="package-card bg-white p-8 rounded-xl shadow-lg border-2 border-transparent hover:border-blue-500 cursor-pointer transition duration-300" data-lessons="6">
            <h4 class="text-2xl font-bold">6-Lesson Package</h4>
            <p class="text-lg font-semibold brand-blue my-2">Great Value</p>
            <p class="text-3xl font-bold mb-4">$${pricing[6]}</p>
            <button class="purchase-btn mt-4 w-full brand-blue-bg hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full text-lg transition duration-300" data-lessons="6" data-price="${pricing[6]}">
                Purchase Now
            </button>
        </div>
        <div class="package-card bg-white p-8 rounded-xl shadow-lg border-2 border-transparent hover:border-blue-500 cursor-pointer transition duration-300" data-lessons="8">
            <h4 class="text-2xl font-bold">8-Lesson Package</h4>
            <p class="text-lg font-semibold brand-blue my-2">Best Value</p>
            <p class="text-3xl font-bold mb-4">$${pricing[8]}</p>
            <button class="purchase-btn mt-4 w-full brand-blue-bg hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full text-lg transition duration-300" data-lessons="8" data-price="${pricing[8]}">
                Purchase Now
            </button>
        </div>
    `;

    // Add click listeners to purchase buttons
    container.querySelectorAll('.purchase-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lessons = parseInt(e.target.dataset.lessons);
            const price = parseInt(e.target.dataset.price);
            handlePackageSelection(selectedProgramName, lessons, price);
        });
    });
}

function setupPaymentForm() {
    console.log('Setting up payment form...');
    console.log('Stripe initialized:', !!stripe);
    console.log('Selected package:', selectedPackage);
    
    if (!stripe || !selectedPackage) {
        console.error('Stripe not initialized or no package selected');
        alert('Payment system error. Please refresh the page and try again.');
        return;
    }

    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
        setupPaymentFormInternal();
    }, 100);
}

function setupPaymentFormInternal() {
    console.log('Setting up payment form (internal)...');

    // Show payment summary
    document.getElementById('payment-summary').innerHTML = `
        <h3 class="text-xl font-bold mb-4">Payment Summary</h3>
        <div class="bg-gray-50 p-4 rounded-lg">
            <p><strong>Program:</strong> ${selectedPackage.program}</p>
            <p><strong>Package:</strong> ${selectedPackage.lessons} lessons</p>
            <p><strong>Total:</strong> $${selectedPackage.price}</p>
        </div>
    `;

    // Show a simple payment form that will create payment intent when clicked
    // Don't create Stripe Elements yet - we need clientSecret first
    const paymentElementDiv = document.getElementById('payment-element');
    paymentElementDiv.innerHTML = `
        <div class="text-center py-8">
            <p class="text-gray-600 mb-4">Click the button below to proceed with payment</p>
            <div class="bg-blue-50 p-4 rounded-lg">
                <p class="text-sm text-blue-800">Secure payment powered by Stripe</p>
            </div>
        </div>
    `;

    // Set up form submission - this will create payment intent first
    const form = document.getElementById('payment-form');
    
    // Remove any existing listeners
    form.removeEventListener('submit', handlePaymentSubmission);
    
    // Add the event listener
    form.addEventListener('submit', handlePaymentSubmission);
    
    console.log('Payment form event listener attached');
}

async function handlePaymentSubmission(event) {
    event.preventDefault();
    
    console.log('Payment form submitted, preventing default behavior');
    
    const submitButton = document.getElementById('pay-button');
    const paymentDiv = document.getElementById('payment-element');
    
    // Check if we need to create the payment form first
    if (!paymentElement) {
        console.log('Creating payment form...');
        
        submitButton.textContent = 'Creating Payment Form...';
        submitButton.disabled = true;

        try {
            // Step 1: Create payment intent on server to get clientSecret
            console.log('Creating payment intent for:', selectedPackage);
            const paymentData = {
                amount: selectedPackage.price * 100, // Convert to cents for Stripe
                program: selectedPackage.program,
                lessons: selectedPackage.lessons
            };
            console.log('Payment data:', paymentData);
            
            const response = await fetch('/.netlify/functions/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            console.log('Content-Type:', contentType);
            
            if (!contentType || !contentType.includes('application/json')) {
                // If not JSON, get the text content to see what we're getting
                const textResponse = await response.text();
                console.error('Non-JSON response received:', textResponse.substring(0, 500));
                throw new Error('Server returned non-JSON response: ' + textResponse.substring(0, 100));
            }
            
            if (!response.ok) {
                const error = await response.json();
                console.error('Server error response:', error);
                throw new Error(error.error || 'Payment failed');
            }
            
            const responseData = await response.json();
            console.log('Success response received:', responseData);
            
            const { clientSecret, packageCode } = responseData;
            console.log('Payment intent created successfully. Client secret received.');
            
            // Store the package code for later use
            window.currentPackageCode = packageCode;
            
            // Step 2: Create Stripe Elements with the clientSecret
            console.log('Creating Stripe Elements with clientSecret...');
            elements = stripe.elements({
                clientSecret: clientSecret
            });
            
            // Step 3: Create and mount payment element
            console.log('Creating payment element...');
            paymentElement = elements.create('payment');
            
            // Clear the placeholder content and mount the real payment element
            paymentDiv.innerHTML = '';
            paymentElement.mount('#payment-element');
            console.log('Payment element mounted successfully');
            
            // Update button text and re-enable it
            submitButton.textContent = 'Complete Payment';
            submitButton.disabled = false;
            
            console.log('Payment form is now ready. User can enter payment details and click Complete Payment again.');
            
        } catch (error) {
            console.error('Failed to create payment form:', error);
            alert('Failed to create payment form: ' + error.message);
            submitButton.textContent = 'Complete Payment';
            submitButton.disabled = false;
        }
        
        return; // Exit here, wait for user to fill form and click again
    }
    
    // If we get here, the payment element exists and user is ready to pay
    console.log('Processing payment...');
    submitButton.textContent = 'Processing Payment...';
    submitButton.disabled = true;

    try {
        // Step 4: Confirm payment with Stripe
        const result = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.href, // Stay on same page
            },
            redirect: 'if_required'
        });
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
        console.log('Payment successful. Package code:', window.currentPackageCode);
        
        // Payment successful - proceed to success
        showPaymentSuccess(window.currentPackageCode);

    } catch (error) {
        console.error('Payment failed:', error);
        alert('Payment failed: ' + error.message);
        submitButton.textContent = 'Complete Payment';
        submitButton.disabled = false;
    }
}

// Generate a mock package code for demo purposes
function generateMockPackageCode() {
    const prefix = selectedPackage.program.toUpperCase().substring(0, 3);
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// Generate mock available dates for demo purposes
function generateMockAvailableDates() {
    const dates = [];
    const today = new Date();
    
    // Generate 15 available time slots over the next 3 weeks
    for (let i = 1; i <= 15; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + Math.floor(i * 1.5));
        
        // Set to various times between 9 AM and 6 PM
        const hours = [9, 10, 11, 14, 15, 16, 17];
        const randomHour = hours[Math.floor(Math.random() * hours.length)];
        futureDate.setHours(randomHour, 0, 0, 0);
        
        dates.push({
            time: futureDate.toISOString(),
            available: true
        });
    }
    
    return dates.sort((a, b) => new Date(a.time) - new Date(b.time));
}

function showPaymentSuccess(packageCode) {
    showSection('success-section');
    updateStepIndicators(4);
    
    document.getElementById('package-code-display').textContent = packageCode;
}

function renderCalendar(classes) {
    console.log(`Rendering calendar with ${classes ? classes.length : 0} available classes.`);
    const calendarLoading = document.getElementById('calendar-loading');
    const calendarContainer = document.getElementById('calendar-container');

    calendarLoading.classList.add('hidden');

    if (!classes || classes.length === 0) {
        calendarContainer.innerHTML = `<p class="text-center text-gray-600">No available times for this program. Please check back soon!</p>`;
        calendarContainer.classList.remove('hidden');
        return;
    }

    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
    classes.slice(0, 15).forEach(classItem => {
        const spotsLeft = classItem.max_capacity - classItem.current_enrollment;
        html += `
            <div class="bg-white p-4 rounded-lg shadow border text-center">
                <p class="font-bold text-lg">${new Date(classItem.date_time).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <p class="text-gray-600">${new Date(classItem.date_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p>
                <p class="text-sm text-gray-500 mt-1">${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} available</p>
                <button class="time-slot mt-4 w-full bg-transparent border-2 border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-full hover:border-blue-500 hover:text-blue-500 transition" data-classid="${classItem.id}" data-datetime="${classItem.date_time}">
                    Book this time
                </button>
            </div>
        `;
    });
    html += `</div>`;

    calendarContainer.innerHTML = html;
    calendarContainer.classList.remove('hidden');

    calendarContainer.querySelectorAll('.time-slot').forEach(slot => {
        slot.addEventListener('click', (e) => {
            const classId = e.target.dataset.classid;
            const datetime = e.target.dataset.datetime;
            console.log(`Class selected: ID ${classId} at ${datetime}`);
            e.target.textContent = 'Booking...';
            e.target.disabled = true;
            renderForm(datetime, classId);
        });
    });
}

function renderForm(selectedDateTime, classId) {
    console.log("Rendering booking form.");
    showSection('form-section');
    const formContainer = document.getElementById('form-container');
    
    // Pre-fill with customer info if available
    const customerInfo = window.customerInfo || {};
    
    formContainer.innerHTML = `
        <form id="booking-form">
            <p class="text-center text-lg mb-6">You're booking for: <strong>${new Date(selectedDateTime).toLocaleString()}</strong></p>
            <div class="space-y-4">
                <div>
                    <label for="firstName" class="block text-sm font-medium text-gray-700">Parent's First Name</label>
                    <input type="text" id="firstName" value="${customerInfo.firstName || ''}" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                    <label for="lastName" class="block text-sm font-medium text-gray-700">Parent's Last Name</label>
                    <input type="text" id="lastName" value="${customerInfo.lastName || ''}" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" id="email" value="${customerInfo.email || ''}" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
                 <div>
                    <label for="phone" class="block text-sm font-medium text-gray-700">Phone</label>
                    <input type="tel" id="phone" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
            </div>
            <div class="mt-8 text-center">
                <button type="submit" class="brand-blue-bg hover:bg-blue-600 text-white font-bold py-4 px-12 rounded-full text-xl transition duration-300 transform hover:scale-105 shadow-lg">Confirm Booking</button>
            </div>
        </form>
    `;

    const form = formContainer.querySelector('#booking-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.textContent = 'Confirming...';
        submitButton.disabled = true;

        const bookingData = {
            packageCode: enteredPackageCode,
            classId: classId,
            customerEmail: document.getElementById('email').value,
            customerName: `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`,
            customerPhone: document.getElementById('phone').value
        };

        console.log("Submitting booking...", bookingData);

        try {
            // Submit booking to backend
            const response = await fetch('/.netlify/functions/book-class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Booking failed');
            }
            
            console.log('Booking successful!', result);
            goToConfirmation();
        } catch (error) {
            console.error('Booking submission failed:', error);
            alert(error.message || 'There was an error confirming your booking. Please try again.');
            submitButton.textContent = 'Confirm Booking';
            submitButton.disabled = false;
        }
    });
}

function goToConfirmation() {
    console.log("Booking successful. Showing confirmation.");
    showSection('confirmation-message');
    document.getElementById('existing-customer-path').classList.add('hidden');
    document.getElementById('new-customer-path').classList.add('hidden');
}

function showSection(sectionId) {
    // Hide all dynamic sections
    ['step-1', 'step-2', 'payment-section', 'success-section', 'calendar-section', 'form-section', 'confirmation-message'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // Show the requested section
    if (sectionId) {
        const elToShow = document.getElementById(sectionId);
        if (elToShow) elToShow.classList.remove('hidden');
    }
}
