// ===================================
// SIMPLE WORKING FIX - renderPackages function
// This version keeps it simple and ensures cards are readable
// ===================================

function renderPackages() {
    const container = document.getElementById('package-container');
    const pricing = PACKAGE_PRICING[selectedProgram];
    
    // Build all three cards as a single HTML string
    let html = '';
    
    [4, 6, 8].forEach(lessons => {
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
            <div class="bg-white rounded-lg shadow-lg border-2 border-gray-200 hover:border-blue-500 transition p-4">
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

// Make selectPackage available globally
window.selectPackage = function(lessons, price) {
    selectedPackage = {
        program: selectedProgram,
        lessons: lessons,
        price: price
    };
    bookingMode = 'package';
    console.log('Package selected:', selectedPackage);
    showStep(3);
    setupPaymentForm();
};