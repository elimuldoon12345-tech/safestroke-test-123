// SafeStroke Complete Booking System
// This replaces the existing booking-logic.js with full functionality

// --- Configuration ---
const PROGRAM_INFO = {
    'Droplet': { 
        ageRange: '3-24 months',
        description: 'Parent & Child classes',
        color: '#60A5FA' // Blue
    },
    'Splashlet': { 
        ageRange: '2-3 years',
        description: 'First independent lessons',
        color: '#34D399' // Green
    },
    'Strokelet': { 
        ageRange: '3-12 years',
        description: 'Skill development',
        color: '#F59E0B' // Orange
    }
};

const PACKAGE_PRICING = {
    'Droplet': { 1: 30, 4: 112, 6: 162, 8: 200 },
    'Splashlet': { 1: 40, 4: 152, 6: 222, 8: 280 },
    'Strokelet': { 1: 45, 4: 172, 6: 252, 8: 320 }
};

// Promo codes configuration
const PROMO_CODES = {
    'FIRST-FREE': {
        type: 'single_lesson',
        discount: 100, // 100% off
        description: 'First lesson free',
        validPrograms: ['Droplet', 'Splashlet', 'Strokelet']
    },
    'SUMMER20': {
        type: 'percentage',
        discount: 20,
        description: '20% off any package',
        validPrograms: ['Droplet', 'Splashlet', 'Strokelet']
    }
};

// --- Global State ---
let selectedProgram = null;
let selectedPackage = null;
let enteredPackageCode = null;
let selectedTimeSlot = null;
let stripe = null;
let elements = null;
let paymentElement = null;
let currentCalendarMonth = new Date(2025, 9, 1); // Default to October 2025
let appliedPromoCode = null;
let bookingMode = null; // 'package' or 'single'
let singleLessonProgram = null;
let singleLessonPrice = null;
let customerEmail = null; // Store email for package purchase

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('SafeStroke Booking System v2.0 Initialized');
    initializeMobileMenu();
    initializeBookingFlow();
    initializeStripe();
    
    // Set default month to October 2025 (when classes start)
    currentCalendarMonth = new Date(2025, 9, 1); // Month is 0-indexed, so 9 = October
});

// --- Initialization Functions ---
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
    // Program selection cards
    document.querySelectorAll('#step-1 .step-card').forEach(card => {
        card.addEventListener('click', handleProgramSelection);
    });
    
    // Navigation buttons
    const backToPrograms = document.getElementById('back-to-programs');
    if (backToPrograms) {
        backToPrograms.addEventListener('click', () => {
            showStep(1);
        });
    }
    
    const backToPackages = document.getElementById('back-to-packages');
    if (backToPackages) {
        backToPackages.addEventListener('click', () => {
            showStep(2);
        });
    }
    
    // Schedule with code button
    const scheduleButton = document.getElementById('schedule-with-code-btn');
    if (scheduleButton) {
        scheduleButton.addEventListener('click', handleScheduleWithCode);
    }
    
    // Book now after payment button
    const bookNowButton = document.getElementById('book-now-btn');
    if (bookNowButton) {
        bookNowButton.addEventListener('click', () => {
            const code = document.getElementById('package-code-display').textContent;
            document.getElementById('package-code-input').value = code;
            handleScheduleWithCode();
        });
    }
}

function initializeStripe() {
    const stripeKey = document.querySelector('meta[name="stripe-public-key"]')?.content || 
                     'pk_test_51S4UnDPRIIfaJZnp1eF8ZlFCD74YDhIU0LVsu3oX3RAy58FBARnucYobBFWf2Wr0wBTZ7smsb1br4ySd2PcfZN4m00oGXz5yQn';
    
    if (typeof Stripe !== 'undefined') {
        stripe = Stripe(stripeKey);
        console.log('Stripe initialized successfully');
    } else {
        console.error('Stripe library not loaded');
    }
}

// --- Event Handlers ---
function handleProgramSelection(event) {
    selectedProgram = event.currentTarget.dataset.programName;
    console.log('Program selected:', selectedProgram);
    showStep(2);
    renderPackages();
}

async function handleScheduleWithCode() {
    const codeInput = document.getElementById('package-code-input');
    const code = codeInput.value.trim();
    const errorMsg = document.getElementById('code-error-message');
    
    if (!code) {
        showError(errorMsg, 'Please enter a package code');
        return;
    }
    
    hideError(errorMsg);
    showCalendarSection();
    
    try {
        // Validate package code with retries for recent payments
        let packageData = null;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            const response = await fetch(`/.netlify/functions/validate-package?code=${code}`);
            const data = await response.json();
            
            if (response.ok && data.valid) {
                packageData = data;
                break;
            }
            
            // Retry if this is a recent payment
            if (window.recentPackageCode === code && attempts < maxAttempts - 1) {
                console.log(`Attempt ${attempts + 1}: Waiting for payment confirmation...`);
                updateCalendarLoading(`Confirming payment... (Attempt ${attempts + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;
            } else {
                throw new Error(data.error || 'Invalid package code');
            }
        }
        
        if (!packageData || !packageData.valid) {
            throw new Error('Package validation failed');
        }
        
        enteredPackageCode = code;
        selectedProgram = packageData.program;
        
        // Display package info
        updateCalendarTitle(code, packageData);
        
        // Load available time slots
        await loadTimeSlots(packageData.program);
        
    } catch (error) {
        console.error('Code validation failed:', error);
        showError(errorMsg, error.message);
        resetToInitialState();
    }
}

// --- UI Rendering Functions ---
function showStep(stepNumber) {
    // Hide all steps including email step
    ['step-1', 'step-2', 'email-step', 'payment-section', 'success-section'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // Show requested step
    const stepId = stepNumber === 1 ? 'step-1' : 
                   stepNumber === 2 ? 'step-2' : 
                   stepNumber === 2.5 ? 'email-step' : // Email collection step
                   stepNumber === 3 ? 'payment-section' : 
                   'success-section';
    
    const stepEl = document.getElementById(stepId);
    if (stepEl) stepEl.classList.remove('hidden');
    
    // Update step indicators
    updateStepIndicators(stepNumber);
}

function updateStepIndicators(activeStep) {
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById(`step-${i}-indicator`);
        if (indicator) {
            indicator.classList.remove('active', 'completed', 'bg-blue-100', 'text-blue-800', 'bg-gray-200', 'text-gray-500');
            
            if (i < activeStep) {
                indicator.classList.add('completed', 'bg-green-500', 'text-white');
            } else if (i === activeStep) {
                indicator.classList.add('active', 'bg-blue-500', 'text-white');
            } else {
                indicator.classList.add('bg-gray-200', 'text-gray-500');
            }
        }
    }
}

function renderPackages() {
    const container = document.getElementById('package-container');
    const pricing = PACKAGE_PRICING[selectedProgram];
    
    // Build all three cards as a single HTML string
    let html = '';
    
    [4, 6, 8].forEach((lessons, index) => {
        const price = pricing[lessons];
        const perLesson = Math.floor(price / lessons);
        
        let badgeHTML = '';
        if (lessons === 6) {
            badgeHTML = '<div class="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full inline-block">Most Popular</div>';
        } else if (lessons === 8) {
            badgeHTML = '<div class="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full inline-block">Best Value</div>';
        } else {
            badgeHTML = '<div style="height: 24px"></div>';
        }
        
        html += `
            <div class="bg-white rounded-lg shadow-lg border-2 border-gray-200 hover:border-blue-500 transition p-4 animate-fade-in" style="animation-delay: ${index * 0.1}s">
                <h4 class="text-xl font-bold mb-2">${lessons} Lessons</h4>
                ${badgeHTML}
                <div class="text-3xl font-bold mt-3 mb-1">$${price}</div>
                <div class="text-sm text-gray-500 mb-3">$${perLesson}/lesson</div>
                <button onclick="selectPackage(${lessons}, ${price})" 
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full text-sm">
                    Select
                </button>
            </div>
        `;
    });
    
    // Set the complete HTML at once
    container.innerHTML = html;
}

// Make selectPackage available globally - Modified to go to email step first
window.selectPackage = function(lessons, price) {
    selectedPackage = {
        program: selectedProgram,
        lessons: lessons,
        price: price
    };
    bookingMode = 'package';
    console.log('Package selected:', selectedPackage);
    
    // ✅ FIXED: Track package selection for Meta Pixel
    if (typeof window.trackPackageSelection === 'function') {
        window.trackPackageSelection(selectedProgram, lessons, price);
    }
    
    // Show email collection step instead of going directly to payment
    showEmailCollectionStep();
}

// New function to show email collection step
function showEmailCollectionStep() {
    // First check if the email step exists, if not create it
    let emailStep = document.getElementById('email-step');
    
    if (!emailStep) {
        // Create the email step div
        emailStep = document.createElement('div');
        emailStep.id = 'email-step';
        emailStep.className = 'hidden';
        
        // Insert it in the package-flow div after step-2
        const packageFlow = document.getElementById('package-flow');
        const step2 = document.getElementById('step-2');
        if (packageFlow && step2) {
            packageFlow.insertBefore(emailStep, step2.nextSibling);
        }
    }
    
    // Create the email collection form
    emailStep.innerHTML = `
        <div class="max-w-md mx-auto">
            <h3 class="text-2xl font-bold text-center mb-6">Enter Your Email</h3>
            
            <div class="bg-blue-50 p-4 rounded-lg mb-6">
                <p class="text-sm text-blue-800">
                    <strong>Why we need your email:</strong><br>
                    • We'll send your package code immediately<br>
                    • You'll get booking confirmations<br>
                    • Never lose your package code again!
                </p>
            </div>
            
            <div class="bg-gray-50 p-6 rounded-lg mb-6">
                <h4 class="font-bold mb-3">Your Selection:</h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span>Program:</span>
                        <span class="font-semibold">${selectedPackage.program}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Package:</span>
                        <span class="font-semibold">${selectedPackage.lessons} Lessons</span>
                    </div>
                    <div class="border-t pt-2 mt-2 flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>$${selectedPackage.price}</span>
                    </div>
                </div>
            </div>
            
            <form id="email-collection-form" class="space-y-4">
                <div>
                    <label for="customer-email" class="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                    </label>
                    <input 
                        type="email" 
                        id="customer-email" 
                        name="email" 
                        required 
                        placeholder="parent@example.com"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                    <p class="text-xs text-gray-500 mt-1">
                        Your package code will be sent to this email
                    </p>
                </div>
                
                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="showStep(2)" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-full">
                        ← Back
                    </button>
                    <button type="submit" class="flex-1 brand-blue-bg hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full">
                        Continue to Payment →
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Show the email step
    showStep(2.5);
    
    // Setup form submission
    const form = document.getElementById('email-collection-form');
    form.onsubmit = handleEmailSubmission;
}

// Handle email submission
async function handleEmailSubmission(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('customer-email');
    customerEmail = emailInput.value.trim();
    
    if (!customerEmail) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Store email and proceed to payment
    console.log('Email collected:', customerEmail);
    
    // Now show payment step
    showStep(3);
    setupPaymentForm();
}

// Modified setupPaymentForm to use the collected email
async function setupPaymentForm() {
    if (!stripe || !selectedPackage) {
        console.error('Stripe not initialized or no package selected');
        return;
    }
    
    // Display payment summary with email
    document.getElementById('payment-summary').innerHTML = `
        <div class="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 class="text-xl font-bold mb-4">Order Summary</h3>
            <div class="space-y-2">
                <div class="flex justify-between">
                    <span>Program:</span>
                    <span class="font-semibold">${selectedPackage.program}</span>
                </div>
                <div class="flex justify-between">
                    <span>Package:</span>
                    <span class="font-semibold">${selectedPackage.lessons} Lessons</span>
                </div>
                ${customerEmail ? `
                <div class="flex justify-between">
                    <span>Email:</span>
                    <span class="font-semibold text-sm">${customerEmail}</span>
                </div>
                ` : ''}
                <div class="border-t pt-2 mt-2">
                    <div class="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>$${selectedPackage.price}</span>
                    </div>
                </div>
            </div>
            <div class="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                <p class="text-sm text-green-800">
                    <strong>✓ Package code will be emailed to you</strong><br>
                    <span class="text-xs">Check your inbox (and spam folder) after payment</span>
                </p>
            </div>
        </div>
    `;
    
    // Setup payment form
    const paymentDiv = document.getElementById('payment-element');
    paymentDiv.innerHTML = `
        <div class="bg-blue-50 p-4 rounded-lg text-center">
            <p class="text-blue-800">Click "Complete Payment" to proceed with secure checkout</p>
        </div>
    `;
    
    // Setup form submission
    const form = document.getElementById('payment-form');
    form.onsubmit = handlePaymentSubmit;
}

// Modified handlePaymentSubmit to include email
async function handlePaymentSubmit(event) {
    event.preventDefault();
    
    const submitButton = document.getElementById('pay-button');
    const paymentDiv = document.getElementById('payment-element');
    
    if (!paymentElement) {
        // Create payment intent first
        submitButton.disabled = true;
        submitButton.textContent = 'Initializing payment...';
        
        try {
            const response = await fetch('/.netlify/functions/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: selectedPackage.price * 100,
                    program: selectedPackage.program,
                    lessons: selectedPackage.lessons,
                    customerEmail: customerEmail // Include the collected email
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Payment initialization failed');
            }
            
            const { clientSecret, packageCode } = await response.json();
            window.recentPackageCode = packageCode;
            
            // Create Stripe Elements with email pre-filled
            elements = stripe.elements({ 
                clientSecret,
                appearance: {
                    theme: 'stripe'
                }
            });
            
            // Create payment element with email pre-filled
            paymentElement = elements.create('payment', {
                defaultValues: {
                    billingDetails: {
                        email: customerEmail
                    }
                }
            });
            
            // Mount payment element
            paymentDiv.innerHTML = '';
            paymentElement.mount('#payment-element');
            
            submitButton.textContent = 'Complete Payment';
            submitButton.disabled = false;
            
        } catch (error) {
            console.error('Payment initialization failed:', error);
            alert('Failed to initialize payment: ' + error.message);
            submitButton.textContent = 'Complete Payment';
            submitButton.disabled = false;
        }
        
        return;
    }
    
    // Process payment
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';
    
    try {
        const result = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.href,
                receipt_email: customerEmail // Ensure Stripe sends receipt to this email
            },
            redirect: 'if_required'
        });
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
        // Payment successful
        showStep(4);
        document.getElementById('package-code-display').textContent = window.recentPackageCode;
        
        // ✅ FIXED: Track successful purchase for Meta Pixel
        if (typeof window.trackPurchase === 'function') {
            window.trackPurchase(selectedPackage.program, selectedPackage, selectedPackage.price);
        }
        
        // Update success message to mention email
        const successSection = document.getElementById('success-section');
        if (successSection && customerEmail) {
            // Add email notification below the package code display
            const codeDisplay = document.getElementById('package-code-display').parentElement;
            if (codeDisplay && !document.getElementById('email-notice')) {
                const emailNotice = document.createElement('div');
                emailNotice.id = 'email-notice';
                emailNotice.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4';
                emailNotice.innerHTML = `
                    <p class="text-blue-800 text-sm">
                        <strong>📧 Check your email!</strong><br>
                        We've sent your package code to <strong>${customerEmail}</strong><br>
                        <span class="text-xs">Be sure to check your spam folder if you don't see it.</span>
                    </p>
                `;
                codeDisplay.parentElement.insertBefore(emailNotice, codeDisplay.nextSibling);
            }
        }
        
    } catch (error) {
        console.error('Payment failed:', error);
        alert('Payment failed: ' + error.message);
        submitButton.textContent = 'Complete Payment';
        submitButton.disabled = false;
    }
}

// Rest of the code remains the same...
// (All the calendar functions, time slot functions, etc. remain unchanged)

// --- Calendar Functions ---
function showCalendarSection() {
    document.getElementById('existing-customer-path').classList.add('hidden');
    document.getElementById('new-customer-path').classList.add('hidden');
    document.getElementById('calendar-section').classList.remove('hidden');
    updateCalendarLoading('Loading available times...');
}

function updateCalendarLoading(message) {
    const loadingDiv = document.getElementById('calendar-loading');
    if (loadingDiv) {
        loadingDiv.innerHTML = `<p class="text-lg text-gray-600">${message}</p>`;
        loadingDiv.classList.remove('hidden');
    }
}

function updateCalendarTitle(code, packageData) {
    const titleEl = document.getElementById('calendar-title');
    if (titleEl) {
        titleEl.innerHTML = `
            <div class="text-center">
                <h2 class="text-3xl font-bold mb-2">Schedule Your Lessons</h2>
                <div class="flex items-center justify-center gap-4 text-sm">
                    <span class="bg-gray-100 px-3 py-1 rounded-full">Code: <strong>${code}</strong></span>
                    <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">${packageData.program}</span>
                    <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full">${packageData.lessons_remaining} lessons remaining</span>
                </div>
            </div>
        `;
    }
}

async function loadTimeSlots(program) {
    try {
        const response = await fetch(`/.netlify/functions/get-time-slots?program=${program}&month=${currentCalendarMonth.toISOString()}`);
        
        if (!response.ok) {
            throw new Error('Failed to load time slots');
        }
        
        const timeSlots = await response.json();
        
        // Debug: Log the raw data received from API
        console.log('=== Time Slots Loaded ===');
        console.log(`Program: ${program}`);
        console.log(`Total slots received: ${timeSlots.length}`);
        
        // Group by date for debugging
        const slotsByDateDebug = {};
        timeSlots.forEach(slot => {
            const date = slot.date.split('T')[0];
            if (!slotsByDateDebug[date]) {
                slotsByDateDebug[date] = [];
            }
            slotsByDateDebug[date].push({
                id: slot.id,
                time: slot.start_time,
                enrollment: slot.current_enrollment,
                capacity: slot.max_capacity,
                available: slot.max_capacity - slot.current_enrollment
            });
        });
        
        console.log('Slots grouped by date:', slotsByDateDebug);
        
        renderCalendar(timeSlots);
        
    } catch (error) {
        console.error('Failed to load time slots:', error);
        document.getElementById('calendar-container').innerHTML = `
            <div class="text-center text-red-600 p-8">
                <p>Failed to load available times. Please try again.</p>
            </div>
        `;
        document.getElementById('calendar-container').classList.remove('hidden');
        document.getElementById('calendar-loading').classList.add('hidden');
    }
}

function renderCalendar(timeSlots) {
    const container = document.getElementById('calendar-container');
    const loadingDiv = document.getElementById('calendar-loading');
    
    loadingDiv.classList.add('hidden');
    
    // Group time slots by date
    const slotsByDate = {};
    timeSlots.forEach(slot => {
        const date = slot.date.split('T')[0];
        if (!slotsByDate[date]) {
            slotsByDate[date] = [];
        }
        slotsByDate[date].push(slot);
    });
    
    // Create calendar HTML
    let html = `
        <div class="bg-white rounded-lg shadow-lg p-6">
            <div class="flex items-center justify-between mb-6">
                <button onclick="changeMonth(-1)" class="p-2 hover:bg-gray-100 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <h3 class="text-xl font-bold">
                    ${currentCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button onclick="changeMonth(1)" class="p-2 hover:bg-gray-100 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            </div>
            
            <div class="grid grid-cols-7 gap-1 mb-2">
                ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => 
                    `<div class="text-center text-sm font-semibold text-gray-600 py-2">${day}</div>`
                ).join('')}
            </div>
            
            <div class="grid grid-cols-7 gap-1">
                ${generateCalendarDays(currentCalendarMonth, slotsByDate)}
            </div>
        </div>
        
        <div id="selected-date-slots" class="mt-6"></div>
    `;
    
    container.innerHTML = html;
    container.classList.remove('hidden');
}

function generateCalendarDays(month, slotsByDate) {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startPadding = firstDay.getDay();
    
    let html = '';
    
    // Add padding for start of month
    for (let i = 0; i < startPadding; i++) {
        html += '<div></div>';
    }
    
    // Add days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(month.getFullYear(), month.getMonth(), day);
        const dateStr = date.toISOString().split('T')[0];
        const slots = slotsByDate[dateStr] || [];
        
        // FIXED: Count available slots for THIS SPECIFIC DATE only
        const availableSlots = slots.filter(s => 
            s.current_enrollment < s.max_capacity
        );
        const availableCount = availableSlots.length;
        
        // Alternative: Count total available SPACES (not just slots)
        const totalAvailableSpaces = availableSlots.reduce((sum, slot) => 
            sum + (slot.max_capacity - slot.current_enrollment), 0
        );
        const hasAvailable = availableCount > 0;
        
        // Debug logging for October 5th and other Sundays
        if (date.getDay() === 0) { // If it's a Sunday
            console.log(`Sunday ${dateStr}: Total slots: ${slots.length}, Available: ${availableCount}`);
            if (slots.length > 0) {
                console.log('Slot details:', slots.map(s => ({
                    id: s.id,
                    enrollment: s.current_enrollment,
                    capacity: s.max_capacity
                })));
            }
        }
        
        const dayOfWeek = date.getDay();
        const isClassDay = dayOfWeek === 0 || dayOfWeek === 1; // Sunday or Monday
        
        let className = 'min-h-[80px] p-2 border rounded-lg ';
        
        if (!isClassDay) {
            className += 'bg-gray-50 cursor-not-allowed';
        } else if (hasAvailable) {
            className += 'bg-green-50 border-green-300 hover:bg-green-100 cursor-pointer';
        } else if (slots.length > 0) {
            className += 'bg-red-50 border-red-300 cursor-not-allowed';
        } else {
            className += 'bg-gray-50 cursor-not-allowed';
        }
        
        html += `
            <div class="${className}" ${hasAvailable ? `onclick="showDateSlots('${dateStr}')"` : ''}>
                <div class="font-semibold text-sm">${day}</div>
                ${isClassDay ? `
                    <div class="text-xs mt-1">
                        ${hasAvailable ? 
                            `<span class="text-green-600">${availableCount} times</span>` :
                            slots.length > 0 ? 
                                '<span class="text-red-600">Full</span>' : 
                                '<span class="text-gray-400">No class</span>'
                        }
                        ${hasAvailable && totalAvailableSpaces > 0 ? 
                            `<div class="text-xs text-gray-500">${totalAvailableSpaces} spaces</div>` : ''
                        }
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    return html;
}

window.changeMonth = function(direction) {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + direction);
    loadTimeSlots(selectedProgram);
};

window.showDateSlots = async function(dateStr) {
    const container = document.getElementById('selected-date-slots');
    const date = new Date(dateStr + 'T00:00:00');
    
    // Remove previous selection highlight
    document.querySelectorAll('.calendar-day-selected').forEach(el => {
        el.classList.remove('calendar-day-selected');
    });
    
    // Add selection highlight to clicked date
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('calendar-day-selected');
    }
    
    // Show loading spinner
    container.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6 text-center">
            <div class="loading-spinner"></div>
            <p class="text-gray-600 mt-4">Loading available times...</p>
        </div>
    `;
    
    // Smooth scroll to loading indicator
    setTimeout(() => {
        container.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest' 
        });
    }, 100);
    
    try {
        const response = await fetch(`/.netlify/functions/get-time-slots?program=${selectedProgram}&date=${dateStr}`);
        const slots = await response.json();
        
        const availableSlots = slots.filter(s => s.current_enrollment < s.max_capacity);
        
        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-lg font-bold">
                        Available times for ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h4>
                    <button onclick="clearDateSelection()" 
                            class="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition">
                        ← Back to calendar
                    </button>
                </div>
                
                ${availableSlots.length > 0 ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${availableSlots.map(slot => `
                            <button onclick="selectTimeSlot('${slot.id}', '${slot.date}', '${slot.start_time}')" 
                                    class="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
                                <div class="font-semibold">
                                    ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}
                                </div>
                                <div class="text-sm text-gray-600 mt-1">
                                    Group ${slot.group_number} • ${slot.max_capacity - slot.current_enrollment} spots left
                                </div>
                            </button>
                        `).join('')}
                    </div>
                ` : `
                    <div class="text-center py-8">
                        <p class="text-gray-500">No available time slots for this date.</p>
                        <p class="text-sm text-gray-400 mt-2">Please select another date.</p>
                    </div>
                `}
            </div>
        `;
        
        // Smooth scroll to the loaded time slots
        setTimeout(() => {
            container.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest' 
            });
        }, 100);
        
    } catch (error) {
        console.error('Failed to load slots for date:', error);
        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="text-red-600 text-center p-4">
                    <p class="font-semibold">Failed to load time slots</p>
                    <p class="text-sm mt-2">Please try again or select another date.</p>
                    <button onclick="clearDateSelection()" 
                            class="mt-4 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-full text-sm transition">
                        Back to calendar
                    </button>
                </div>
            </div>
        `;
    }
};

// Helper function to clear date selection
window.clearDateSelection = function() {
    // Remove selection highlight
    document.querySelectorAll('.calendar-day-selected').forEach(el => {
        el.classList.remove('calendar-day-selected');
    });
    
    // Clear the time slots display
    const container = document.getElementById('selected-date-slots');
    container.innerHTML = '';
    
    // Scroll back to calendar
    const calendarContainer = document.getElementById('calendar-container');
    if (calendarContainer) {
        calendarContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
        });
    }
};

window.selectTimeSlot = function(slotId, date, time) {
    selectedTimeSlot = { id: slotId, date: date, time: time };
    showBookingForm();
};

function showBookingForm() {
    document.getElementById('calendar-section').classList.add('hidden');
    document.getElementById('form-section').classList.remove('hidden');
    
    const container = document.getElementById('form-container');
    const dateTime = new Date(`${selectedTimeSlot.date}T${selectedTimeSlot.time}`);
    
    container.innerHTML = `
        <form id="booking-form" class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-lg mb-6">
                <p class="text-center">
                    <strong>Selected Time:</strong><br>
                    ${dateTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}<br>
                    ${formatTime(selectedTimeSlot.time)}
                </p>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                <input type="text" name="studentName" required 
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Student Birthdate</label>
                <input type="date" name="studentBirthdate" 
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Parent/Guardian Name *</label>
                <input type="text" name="parentName" required 
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" name="email" required 
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input type="tel" name="phone" required 
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Special Notes (optional)</label>
                <textarea name="notes" rows="3"
                          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Any special requirements, medical conditions, etc."></textarea>
            </div>
            
            <div class="pt-4">
                <button type="submit" id="booking-submit-btn" class="w-full brand-blue-bg hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full text-lg transition">
                    Confirm Booking
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('booking-form').onsubmit = handleBookingSubmit;
    
    // Add birthday validation listener
    setupBirthdayValidation();
}

async function handleBookingSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    submitButton.disabled = true;
    submitButton.textContent = 'Booking...';
    
    const formData = new FormData(form);
    const bookingData = {
        packageCode: enteredPackageCode,
        timeSlotId: selectedTimeSlot.id,
        studentName: formData.get('studentName'),
        studentBirthdate: formData.get('studentBirthdate'),
        customerName: formData.get('parentName'),
        customerEmail: formData.get('email'),
        customerPhone: formData.get('phone'),
        notes: formData.get('notes'),
        childBirthday: formData.get('studentBirthdate') // Include birthday in booking data
    };
    
    try {
        const response = await fetch('/.netlify/functions/book-time-slot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Booking failed');
        }
        
        const result = await response.json();
        showConfirmation(result);
        
    } catch (error) {
        console.error('Booking failed:', error);
        alert('Booking failed: ' + error.message);
        submitButton.disabled = false;
        submitButton.textContent = 'Confirm Booking';
    }
}

function showConfirmation(bookingResult) {
    document.getElementById('form-section').classList.add('hidden');
    document.getElementById('confirmation-message').classList.remove('hidden');
    
    const confirmDiv = document.getElementById('confirmation-message');
    confirmDiv.innerHTML = `
        <div class="text-center">
            <div class="text-green-500 mb-4">
                <svg class="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
            <h2 class="text-3xl font-bold mb-4">Booking Confirmed!</h2>
            <p class="text-lg text-gray-600 mb-6">
                Your lesson has been successfully booked. We've sent a confirmation email with all the details. Be sure to check your spam folder.
            </p>
            <div class="bg-gray-50 p-6 rounded-lg text-left max-w-md mx-auto">
                <h3 class="font-bold mb-3">Booking Details:</h3>
                <div class="space-y-2 text-sm">
                    <div><strong>Booking ID:</strong> ${bookingResult.bookingId}</div>
                    <div><strong>Lessons Remaining:</strong> ${bookingResult.lessonsRemaining}</div>
                </div>
            </div>
            <div class="mt-8 space-x-4">
                <button onclick="bookAnotherLesson()" class="brand-blue-bg hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full">
                    Book Another Lesson
                </button>
                <a href="index.html" class="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-full">
                    Return Home
                </a>
            </div>
        </div>
    `;
}

// --- Age Verification Functions ---
function setupBirthdayValidation() {
    const birthdayInput = document.getElementById('child-birthday');
    const verificationResult = document.getElementById('age-verification-result');
    const submitButton = document.getElementById('booking-submit-btn');
    
    if (birthdayInput) {
        birthdayInput.addEventListener('change', function() {
            validateChildAge(this.value, selectedProgram);
        });
    }
}

function validateChildAge(birthDateString, program) {
    const verificationResult = document.getElementById('age-verification-result');
    const submitButton = document.getElementById('booking-submit-btn');
    
    if (!birthDateString) {
        verificationResult.classList.add('hidden');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Please enter child\'s birthday';
            submitButton.classList.add('bg-gray-400', 'cursor-not-allowed');
            submitButton.classList.remove('brand-blue-bg', 'hover:bg-blue-600');
        }
        return false;
    }
    
    const birthDate = new Date(birthDateString);
    const today = new Date();
    
    // Calculate age in months
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                       (today.getMonth() - birthDate.getMonth());
    
    // Calculate age in years for display
    const ageInYears = Math.floor(ageInMonths / 12);
    const remainingMonths = ageInMonths % 12;
    
    // Define age requirements for each program
    const ageRequirements = {
        'Droplet': { minMonths: 3, maxMonths: 24 },
        'Splashlet': { minMonths: 24, maxMonths: 48 }, // 2-4 years
        'Strokelet': { minMonths: 36, maxMonths: 144 }  // 3-12 years
    };
    
    const requirement = ageRequirements[program];
    const isAgeAppropriate = ageInMonths >= requirement.minMonths && ageInMonths <= requirement.maxMonths;
    
    // Format age display
    let ageDisplay = '';
    if (ageInYears > 0) {
        ageDisplay = `${ageInYears} year${ageInYears > 1 ? 's' : ''}`;
        if (remainingMonths > 0) {
            ageDisplay += ` and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
        }
    } else {
        ageDisplay = `${ageInMonths} month${ageInMonths > 1 ? 's' : ''}`;
    }
    
    verificationResult.classList.remove('hidden');
    
    if (isAgeAppropriate) {
        // Age is appropriate
        verificationResult.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                <div class="flex items-center">
                    <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                    <div>
                        <p class="text-sm font-medium text-green-800">Age verified: ${ageDisplay} old</p>
                        <p class="text-xs text-green-600">Perfect fit for ${program} program!</p>
                    </div>
                </div>
            </div>
        `;
        
        // Enable submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Confirm Booking';
            submitButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
            submitButton.classList.add('brand-blue-bg', 'hover:bg-blue-600');
        }
        
        return true;
    } else {
        // Age is not appropriate
        const suggestedProgram = getSuggestedProgram(ageInMonths);
        
        verificationResult.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                <div class="flex items-start">
                    <svg class="w-5 h-5 text-red-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
                    <div>
                        <p class="text-sm font-medium text-red-800">Age verification failed</p>
                        <p class="text-xs text-red-600 mb-2">Your child is ${ageDisplay} old, but ${program} is for ${getProgramAgeRange(program)}.</p>
                        ${suggestedProgram ? `
                            <p class="text-xs text-red-600">
                                <strong>Recommended:</strong> ${suggestedProgram} program would be perfect for your child's age.
                            </p>
                            <button type="button" onclick="switchToSuggestedProgram('${suggestedProgram}')" 
                                    class="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-full font-semibold">
                                Switch to ${suggestedProgram}
                            </button>
                        ` : `
                            <p class="text-xs text-red-600">Please contact us to discuss appropriate program options.</p>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        // Disable submit button
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Age verification required';
            submitButton.classList.add('bg-gray-400', 'cursor-not-allowed');
            submitButton.classList.remove('brand-blue-bg', 'hover:bg-blue-600');
        }
        
        return false;
    }
}

function getSuggestedProgram(ageInMonths) {
    if (ageInMonths >= 3 && ageInMonths <= 24) {
        return 'Droplet';
    } else if (ageInMonths >= 24 && ageInMonths <= 48) {
        return 'Splashlet';
    } else if (ageInMonths >= 36 && ageInMonths <= 144) {
        return 'Strokelet';
    }
    return null;
}

function getProgramAgeRange(program) {
    const ranges = {
        'Droplet': '3-24 months',
        'Splashlet': '2-3 years',
        'Strokelet': '3-12 years'
    };
    return ranges[program] || 'unknown age range';
}

window.switchToSuggestedProgram = function(suggestedProgram) {
    // Update the selected program
    selectedProgram = suggestedProgram;
    
    // Re-validate with the new program
    const birthdayInput = document.getElementById('child-birthday');
    if (birthdayInput && birthdayInput.value) {
        validateChildAge(birthdayInput.value, selectedProgram);
    }
    
    // Update any display elements that show the selected program
    const titleEl = document.getElementById('calendar-title');
    if (titleEl && enteredPackageCode) {
        // If we came from a package code, we need to validate the package supports this program
        alert(`Switched to ${suggestedProgram} program. Please note: you may need a different package code if your current package is not valid for this program.`);
    }
};

// --- Helper Functions ---
function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
}

function showError(element, message) {
    if (element) {
        element.textContent = message;
        element.classList.remove('hidden');
    }
}

function hideError(element) {
    if (element) {
        element.classList.add('hidden');
    }
}

function resetToInitialState() {
    document.getElementById('existing-customer-path').classList.remove('hidden');
    document.getElementById('new-customer-path').classList.remove('hidden');
    document.getElementById('calendar-section').classList.add('hidden');
    document.getElementById('form-section').classList.add('hidden');
    document.getElementById('confirmation-message').classList.add('hidden');
    
    // Reset global state
    selectedProgram = null;
    selectedPackage = null;
    enteredPackageCode = null;
    selectedTimeSlot = null;
    appliedPromoCode = null;
    bookingMode = null;
    customerEmail = null;
}

// New function for applying promo codes
window.applyPromoCode = function() {
    const promoInput = document.getElementById('promo-code-input');
    const promoMessage = document.getElementById('promo-message');
    const code = promoInput.value.trim().toUpperCase();
    
    if (!code) {
        promoMessage.textContent = 'Please enter a promo code';
        promoMessage.className = 'text-sm text-red-600';
        promoMessage.classList.remove('hidden');
        return;
    }
    
    const promo = PROMO_CODES[code];
    
    if (!promo) {
        promoMessage.textContent = 'Invalid promo code';
        promoMessage.className = 'text-sm text-red-600';
        promoMessage.classList.remove('hidden');
        appliedPromoCode = null;
        return;
    }
    
    if (!promo.validPrograms.includes(selectedProgram)) {
        promoMessage.textContent = `This code is not valid for ${selectedProgram} lessons`;
        promoMessage.className = 'text-sm text-red-600';
        promoMessage.classList.remove('hidden');
        appliedPromoCode = null;
        return;
    }
    
    appliedPromoCode = { code, ...promo };
    
    if (promo.type === 'single_lesson' && promo.discount === 100) {
        promoMessage.innerHTML = `✅ <strong>${promo.description}</strong> applied!`;
        promoMessage.className = 'text-sm text-green-600 font-semibold';
    } else {
        promoMessage.innerHTML = `✅ <strong>${promo.discount}% off</strong> applied!`;
        promoMessage.className = 'text-sm text-green-600 font-semibold';
    }
    
    promoMessage.classList.remove('hidden');
};

// New function for selecting single lesson
window.selectSingleLesson = function() {
    const basePrice = PACKAGE_PRICING[selectedProgram][1];
    let finalPrice = basePrice;
    
    if (appliedPromoCode) {
        if (appliedPromoCode.type === 'single_lesson') {
            finalPrice = basePrice * (1 - appliedPromoCode.discount / 100);
        }
    }
    
    selectedPackage = {
        program: selectedProgram,
        lessons: 1,
        price: finalPrice,
        promoCode: appliedPromoCode ? appliedPromoCode.code : null
    };
    
    bookingMode = 'single';
    
    if (finalPrice === 0) {
        // Free lesson - skip payment, create a free package code
        handleFreeLesson();
    } else {
        showStep(3);
        setupPaymentForm();
    }
};

// New function for handling free lessons
async function handleFreeLesson() {
    try {
        const response = await fetch('/.netlify/functions/create-free-package', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                program: selectedProgram,
                promoCode: appliedPromoCode.code
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create free lesson package');
        }
        
        const { packageCode } = await response.json();
        enteredPackageCode = packageCode;
        
        // Skip to calendar selection
        showCalendarSection();
        updateCalendarTitle(packageCode, {
            program: selectedProgram,
            lessons_remaining: 1
        });
        loadTimeSlots(selectedProgram);
        
    } catch (error) {
        console.error('Failed to create free lesson:', error);
        alert('Failed to process free lesson. Please try again.');
    }
}

// New function for "Book Another Lesson" button
window.bookAnotherLesson = function() {
    // Check if there's an existing package code with remaining lessons
    if (enteredPackageCode && bookingMode === 'package') {
        // Clear only the booking-specific data, keep the package code
        document.getElementById('confirmation-message').classList.add('hidden');
        document.getElementById('form-section').classList.add('hidden');
        selectedTimeSlot = null;
        
        // Go back to calendar with the same package
        showCalendarSection();
        loadTimeSlots(selectedProgram);
    } else {
        // For single lessons or when package is exhausted, start fresh
        location.reload();
    }
};

// New functions for separated single lesson and package flows
window.startSingleLessonFlow = function() {
    // Hide the option selection
    document.getElementById('new-customer-path').classList.add('hidden');
    document.getElementById('existing-customer-path').classList.add('hidden');
    
    // Show single lesson flow
    document.getElementById('single-lesson-flow').classList.remove('hidden');
    bookingMode = 'single';
};

window.startPackageFlow = function() {
    // Hide the option selection
    document.getElementById('new-customer-path').classList.add('hidden');
    document.getElementById('existing-customer-path').classList.add('hidden');
    
    // Show package flow
    document.getElementById('package-flow').classList.remove('hidden');
    bookingMode = 'package';
};

window.backToOptions = function() {
    // Hide all flows
    document.getElementById('single-lesson-flow').classList.add('hidden');
    document.getElementById('package-flow').classList.add('hidden');
    
    // Show option selection
    document.getElementById('new-customer-path').classList.remove('hidden');
    document.getElementById('existing-customer-path').classList.remove('hidden');
    
    // Reset states
    selectedProgram = null;
    singleLessonProgram = null;
    appliedPromoCode = null;
    bookingMode = null;
};

window.selectSingleLessonProgram = function(program) {
    singleLessonProgram = program;
    singleLessonPrice = PACKAGE_PRICING[program][1];
    
    // Check if promo code is applied
    if (appliedPromoCode && appliedPromoCode.type === 'single_lesson') {
        singleLessonPrice = singleLessonPrice * (1 - appliedPromoCode.discount / 100);
    }
    
    // ✅ FIXED: Track single lesson selection for Meta Pixel
    if (typeof window.trackSingleLessonSelection === 'function') {
        window.trackSingleLessonSelection(program, singleLessonPrice);
    }
    
    // If free lesson, create free package and go to calendar
    if (singleLessonPrice === 0) {
        handleFreeSingleLesson();
    } else {
        // Go to calendar for time selection
        proceedToSingleLessonCalendar();
    }
};

window.applySingleLessonPromo = function() {
    const promoInput = document.getElementById('single-promo-input');
    const promoMessage = document.getElementById('single-promo-message');
    const code = promoInput.value.trim().toUpperCase();
    
    if (!code) {
        promoMessage.textContent = 'Please enter a promo code';
        promoMessage.className = 'text-sm text-red-600';
        promoMessage.classList.remove('hidden');
        return;
    }
    
    const promo = PROMO_CODES[code];
    
    if (!promo) {
        promoMessage.textContent = 'Invalid promo code';
        promoMessage.className = 'text-sm text-red-600';
        promoMessage.classList.remove('hidden');
        appliedPromoCode = null;
        resetPriceDisplays();
        return;
    }
    
    if (promo.type !== 'single_lesson') {
        promoMessage.textContent = 'This code is only valid for packages, not single lessons';
        promoMessage.className = 'text-sm text-red-600';
        promoMessage.classList.remove('hidden');
        appliedPromoCode = null;
        resetPriceDisplays();
        return;
    }
    
    appliedPromoCode = { code, ...promo };
    
    // ✅ FIXED: Track promo code application for Meta Pixel
    if (typeof window.trackPromoCode === 'function') {
        window.trackPromoCode(code, 'single_lesson');
    }
    
    if (promo.discount === 100) {
        promoMessage.innerHTML = `✅ <strong>${promo.description}</strong> applied! Select a program to continue.`;
        promoMessage.className = 'text-sm text-green-600 font-semibold';
        
        // Update all price displays to show FREE with crossed out original price
        updatePriceDisplaysForFree();
    } else {
        promoMessage.innerHTML = `✅ <strong>${promo.discount}% off</strong> applied!`;
        promoMessage.className = 'text-sm text-green-600 font-semibold';
    }
    
    promoMessage.classList.remove('hidden');
};

function updatePriceDisplaysForFree() {
    // Update Droplet price with crossed-out original price
    const dropletPrice = document.getElementById('droplet-price');
    if (dropletPrice) {
        dropletPrice.innerHTML = `
            <p class="text-2xl font-bold">
                <span class="line-through text-gray-400">$30</span>
                <span class="text-green-600 ml-2">FREE</span>
            </p>
            <p class="text-sm text-green-600 font-semibold">First lesson free!</p>
        `;
    }
    
    // Update Splashlet price with crossed-out original price
    const splashletPrice = document.getElementById('splashlet-price');
    if (splashletPrice) {
        splashletPrice.innerHTML = `
            <p class="text-2xl font-bold">
                <span class="line-through text-gray-400">$40</span>
                <span class="text-green-600 ml-2">FREE</span>
            </p>
            <p class="text-sm text-green-600 font-semibold">First lesson free!</p>
        `;
    }
    
    // Update Strokelet price with crossed-out original price
    const strokeletPrice = document.getElementById('strokelet-price');
    if (strokeletPrice) {
        strokeletPrice.innerHTML = `
            <p class="text-2xl font-bold">
                <span class="line-through text-gray-400">$45</span>
                <span class="text-green-600 ml-2">FREE</span>
            </p>
            <p class="text-sm text-green-600 font-semibold">First lesson free!</p>
        `;
    }
}

function resetPriceDisplays() {
    // Reset Droplet price
    const dropletPrice = document.getElementById('droplet-price');
    if (dropletPrice) {
        dropletPrice.innerHTML = `
            <p class="text-2xl font-bold brand-blue">$30</p>
            <p class="text-sm text-gray-500">per lesson</p>
        `;
    }
    
    // Reset Splashlet price
    const splashletPrice = document.getElementById('splashlet-price');
    if (splashletPrice) {
        splashletPrice.innerHTML = `
            <p class="text-2xl font-bold brand-blue">$40</p>
            <p class="text-sm text-gray-500">per lesson</p>
        `;
    }
    
    // Reset Strokelet price
    const strokeletPrice = document.getElementById('strokelet-price');
    if (strokeletPrice) {
        strokeletPrice.innerHTML = `
            <p class="text-2xl font-bold brand-blue">$45</p>
            <p class="text-sm text-gray-500">per lesson</p>
        `;
    }
}

async function handleFreeSingleLesson() {
    try {
        const response = await fetch('/.netlify/functions/create-free-package', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                program: singleLessonProgram,
                promoCode: appliedPromoCode.code
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create free lesson package');
        }
        
        const { packageCode } = await response.json();
        enteredPackageCode = packageCode;
        selectedProgram = singleLessonProgram;
        
        // Hide single lesson flow and show calendar
        document.getElementById('single-lesson-flow').classList.add('hidden');
        showCalendarSection();
        updateCalendarTitle(packageCode, {
            program: singleLessonProgram,
            lessons_remaining: 1
        });
        loadTimeSlots(singleLessonProgram);
        
    } catch (error) {
        console.error('Failed to create free lesson:', error);
        alert('Failed to process free lesson. Please try again.');
    }
}

function proceedToSingleLessonCalendar() {
    selectedProgram = singleLessonProgram;
    
    // Hide single lesson flow
    document.getElementById('single-lesson-flow').classList.add('hidden');
    
    // Show calendar for time selection
    document.getElementById('calendar-section').classList.remove('hidden');
    document.getElementById('calendar-loading').classList.add('hidden');
    
    // Update title for single lesson
    const titleEl = document.getElementById('calendar-title');
    if (titleEl) {
        titleEl.innerHTML = `
            <div class="text-center">
                <h2 class="text-3xl font-bold mb-2">Select Your Lesson Time</h2>
                <div class="flex items-center justify-center gap-4 text-sm">
                    <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">${singleLessonProgram}</span>
                    <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full">Single Lesson - $${singleLessonPrice}</span>
                </div>
            </div>
        `;
    }
    
    // Load available times
    loadTimeSlots(singleLessonProgram);
}

// Modify the existing selectTimeSlot function to handle single lesson checkout
const originalSelectTimeSlot = window.selectTimeSlot;
window.selectTimeSlot = function(slotId, date, time) {
    selectedTimeSlot = { id: slotId, date: date, time: time };
    
    if (bookingMode === 'single' && !enteredPackageCode) {
        // For single lessons without a package code (paid single lessons)
        showSingleLessonCheckout();
    } else {
        // Original flow for packages or free single lessons
        showBookingForm();
    }
};

function showSingleLessonCheckout() {
    document.getElementById('calendar-section').classList.add('hidden');
    
    // Create checkout form for single lesson
    const container = document.createElement('div');
    container.id = 'single-lesson-checkout';
    container.className = 'max-w-lg mx-auto mt-12 bg-white p-8 rounded-xl shadow-lg border';
    container.innerHTML = `
        <h2 class="text-2xl font-bold text-center mb-6">Complete Your Booking</h2>
        
        <div class="bg-blue-50 p-4 rounded-lg mb-6">
            <p class="text-center">
                <strong>Selected Time:</strong><br>
                ${new Date(selectedTimeSlot.date + 'T' + selectedTimeSlot.time).toLocaleDateString('en-US', { 
                    weekday: 'long', month: 'long', day: 'numeric' 
                })}<br>
                ${formatTime(selectedTimeSlot.time)}
            </p>
            <p class="text-center mt-2">
                <strong>Program:</strong> ${singleLessonProgram}<br>
                <strong>Price:</strong> $${singleLessonPrice}
            </p>
        </div>
        
        <form id="single-lesson-form" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                <input type="text" name="studentName" required 
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Student Birthdate</label>
                <input type="date" name="studentBirthdate" 
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Parent/Guardian Name *</label>
                <input type="text" name="parentName" required 
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" name="email" required 
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input type="tel" name="phone" required 
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div id="payment-element-single" class="mt-6">
                <!-- Stripe payment will be mounted here -->
            </div>
            
            <div id="payment-error" class="text-red-600 text-sm hidden"></div>
            
            <div class="pt-4">
                <button type="submit" id="single-lesson-submit" class="w-full brand-blue-bg hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full text-lg transition">
                    Continue to Payment
                </button>
            </div>
        </form>
    `;
    
    // Remove any existing checkout container
    const existing = document.getElementById('single-lesson-checkout');
    if (existing) {
        existing.remove();
    }
    
    document.querySelector('main .container').appendChild(container);
    
    // Initialize payment for single lesson
    initializeSingleLessonPayment();
}

async function initializeSingleLessonPayment() {
    const form = document.getElementById('single-lesson-form');
    const submitButton = document.getElementById('single-lesson-submit');
    const errorDiv = document.getElementById('payment-error');
    
    let singleLessonElements = null;
    let singleLessonPaymentElement = null;
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(form);
        
        // Validate form
        if (!formData.get('studentName') || !formData.get('parentName') || !formData.get('email') || !formData.get('phone')) {
            errorDiv.textContent = 'Please fill in all required fields';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        submitButton.disabled = true;
        submitButton.textContent = 'Initializing payment...';
        errorDiv.classList.add('hidden');
        
        try {
            // Step 1: Create payment intent and booking record
            const response = await fetch('/.netlify/functions/book-single-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    program: singleLessonProgram,
                    price: singleLessonPrice,
                    timeSlotId: selectedTimeSlot.id,
                    studentName: formData.get('studentName'),
                    studentBirthdate: formData.get('studentBirthdate') || null,
                    customerName: formData.get('parentName'),
                    customerEmail: formData.get('email'),
                    customerPhone: formData.get('phone')
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to initialize payment');
            }
            
            const result = await response.json();
            
            // Step 2: Create Stripe Elements with the client secret
            if (!singleLessonElements) {
                singleLessonElements = stripe.elements({
                    clientSecret: result.clientSecret
                });
                
                // Create and mount payment element
                singleLessonPaymentElement = singleLessonElements.create('payment');
                singleLessonPaymentElement.mount('#payment-element-single');
                
                // Store the package code for later
                window.tempSingleLessonPackageCode = result.packageCode;
                
                // Update button text
                submitButton.textContent = 'Complete Payment';
                submitButton.disabled = false;
                
                // Change form behavior for payment submission
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    
                    submitButton.disabled = true;
                    submitButton.textContent = 'Processing payment...';
                    
                    try {
                        // Step 3: Confirm payment with Stripe
                        const { error: stripeError } = await stripe.confirmPayment({
                            elements: singleLessonElements,
                            confirmParams: {
                                return_url: window.location.href
                            },
                            redirect: 'if_required'
                        });
                        
                        if (stripeError) {
                            throw new Error(stripeError.message);
                        }
                        
                        // Step 4: Payment successful, now complete the booking
                        await completeSingleLessonBooking();
                        
                    } catch (error) {
                        errorDiv.textContent = 'Payment failed: ' + error.message;
                        errorDiv.classList.remove('hidden');
                        submitButton.disabled = false;
                        submitButton.textContent = 'Complete Payment';
                    }
                };
            }
            
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
            submitButton.disabled = false;
            submitButton.textContent = 'Continue to Payment';
        }
    };
}

async function completeSingleLessonBooking() {
    try {
        // Use the package code to book the time slot
        const packageCode = window.tempSingleLessonPackageCode;
        
        if (!packageCode) {
            throw new Error('Package code not found');
        }
        
        // Get the form data again
        const form = document.getElementById('single-lesson-form');
        const formData = new FormData(form);
        
        // Show loading message
        const submitButton = document.getElementById('single-lesson-submit');
        submitButton.textContent = 'Finalizing booking...';
        
        // Retry booking with exponential backoff to wait for webhook
        let attempts = 0;
        const maxAttempts = 5;
        let bookingSuccessful = false;
        let result = null;
        
        while (attempts < maxAttempts && !bookingSuccessful) {
            attempts++;
            
            // Wait before retrying (except on first attempt)
            if (attempts > 1) {
                const waitTime = Math.min(2000 * Math.pow(1.5, attempts - 1), 10000); // Max 10 seconds
                console.log(`Attempt ${attempts}: Waiting ${waitTime}ms for payment confirmation...`);
                submitButton.textContent = `Confirming payment... (Attempt ${attempts}/${maxAttempts})`;
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            try {
                // Try to book the time slot
                const response = await fetch('/.netlify/functions/book-time-slot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        packageCode: packageCode,
                        timeSlotId: selectedTimeSlot.id,
                        studentName: formData.get('studentName'),
                        studentBirthdate: formData.get('studentBirthdate') || null,
                        customerName: formData.get('parentName'),
                        customerEmail: formData.get('email'),
                        customerPhone: formData.get('phone'),
                        notes: 'Single lesson booking'
                    })
                });
                
                if (response.ok) {
                    result = await response.json();
                    bookingSuccessful = true;
                } else {
                    const errorData = await response.json();
                    console.log(`Attempt ${attempts} failed:`, errorData.error);
                    
                    // If it's not a "package not paid" error, stop retrying
                    if (!errorData.error.includes('Invalid package code') && 
                        !errorData.error.includes('package')) {
                        throw new Error(errorData.error);
                    }
                }
            } catch (fetchError) {
                console.error(`Attempt ${attempts} error:`, fetchError);
                // Continue retrying unless it's the last attempt
                if (attempts === maxAttempts) {
                    throw fetchError;
                }
            }
        }
        
        if (!bookingSuccessful) {
            throw new Error('Unable to confirm booking after payment. The webhook may be delayed.');
        }
        
        // Hide the checkout form
        const checkoutContainer = document.getElementById('single-lesson-checkout');
        if (checkoutContainer) {
            checkoutContainer.remove();
        }
        
        // ✅ FIXED: Track single lesson purchase for Meta Pixel
        if (typeof window.trackPurchase === 'function') {
            window.trackPurchase(singleLessonProgram, { lessons: 1 }, singleLessonPrice);
        }
        
        // Show success message
        showConfirmation({
            bookingId: result.bookingId,
            lessonsRemaining: 0,
            singleLesson: true
        });
        
        // Clean up
        delete window.tempSingleLessonPackageCode;
        
    } catch (error) {
        console.error('Failed to complete booking:', error);
        
        // Provide more helpful error message
        const packageCode = window.tempSingleLessonPackageCode;
        alert(`Payment successful but booking confirmation is delayed.\n\nYour package code is: ${packageCode}\n\nPlease save this code and try booking again in a few moments using the "Already have a package code?" option, or contact support if the issue persists.`);
    }
}

// --- Remove Age Requirements Warning ---
// This code removes any age requirements warning that might appear on the page
function removeAgeRequirementsWarning() {
    // Try multiple selectors to find and remove the warning
    const selectors = [
        // Look for elements containing the specific text
        '//*[contains(text(), "Important: Age Requirements")]',
        '//*[contains(text(), "verify your child\'s age")]',
        '//*[contains(text(), "birthday to confirm eligibility")]',
        // Look for common warning/alert classes
        '.alert-warning',
        '.warning-message',
        '.age-warning',
        // Look for yellow/warning colored boxes
        '[style*="background-color: rgb(254, 249, 195)"]',
        '[style*="background-color: #fef9c3"]',
        '[style*="background: rgb(254, 249, 195)"]',
        '[style*="background: #fef9c3"]'
    ];
    
    // Try XPath selectors first
    const xpathSelectors = selectors.slice(0, 3);
    xpathSelectors.forEach(xpath => {
        try {
            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for (let i = 0; i < result.snapshotLength; i++) {
                const element = result.snapshotItem(i);
                // Go up to find the container element and remove it
                let container = element;
                while (container && container.parentElement) {
                    if (container.className && container.className.includes('alert') || 
                        container.className && container.className.includes('warning') ||
                        container.style.backgroundColor === 'rgb(254, 249, 195)' ||
                        container.style.backgroundColor === '#fef9c3') {
                        container.remove();
                        console.log('Removed age requirements warning');
                        return;
                    }
                    container = container.parentElement;
                }
                element.remove();
            }
        } catch (e) {
            // XPath might not work in all browsers, continue with CSS selectors
        }
    });
    
    // Try CSS selectors
    const cssSelectors = selectors.slice(3);
    cssSelectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.textContent && 
                    (el.textContent.includes('Age Requirements') || 
                     el.textContent.includes('verify your child') ||
                     el.textContent.includes('birthday to confirm'))) {
                    el.remove();
                    console.log('Removed age requirements warning');
                }
            });
        } catch (e) {
            // Continue if selector fails
        }
    });
}

// Run the removal function when the page loads and when content changes
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeAgeRequirementsWarning);
} else {
    removeAgeRequirementsWarning();
}

// Also run when content is dynamically updated
const observer = new MutationObserver(() => {
    removeAgeRequirementsWarning();
});

// Start observing the document for changes
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Also remove it when steps change
const originalShowStep = showStep;
showStep = function(stepNumber) {
    originalShowStep(stepNumber);
    setTimeout(removeAgeRequirementsWarning, 100);
};