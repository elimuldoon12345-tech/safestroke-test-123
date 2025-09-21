// This is the fixed renderPackages function to replace in booking-system-v2.js

function renderPackages() {
    const container = document.getElementById('package-container');
    const pricing = PACKAGE_PRICING[selectedProgram];
    
    // Build the HTML with proper formatting
    let packagesHtml = '';
    [4, 6, 8].forEach(lessons => {
        const price = pricing[lessons];
        const perLesson = Math.floor(price / lessons);
        
        let badge = '';
        if (lessons === 6) {
            badge = '<span class="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-4 py-2 rounded-full whitespace-nowrap">Most Popular</span>';
        } else if (lessons === 8) {
            badge = '<span class="inline-block bg-green-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-full whitespace-nowrap">Best Value</span>';
        } else {
            badge = '<div class="h-10">&nbsp;</div>';
        }
        
        packagesHtml += `
            <div class="package-card bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:border-blue-500 transition-all hover:-translate-y-1 hover:shadow-xl">
                <div class="p-8">
                    <div class="text-center">
                        <!-- Package Size -->
                        <h4 class="text-3xl font-bold text-gray-900 mb-4">${lessons} Lessons</h4>
                        
                        <!-- Badge -->
                        ${badge}
                        
                        <!-- Price Section -->
                        <div class="mt-6 mb-6">
                            <div class="text-5xl font-black text-gray-900">$${price}</div>
                            <div class="text-lg text-gray-500 mt-2">$${perLesson} per lesson</div>
                        </div>
                        
                        <!-- Button -->
                        <button class="purchase-btn w-full brand-blue-bg hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                                data-lessons="${lessons}" 
                                data-price="${price}">
                            Select Package
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = `
        <div class="text-center mb-8">
            <h3 class="text-2xl font-bold">${selectedProgram} Packages</h3>
            <p class="text-gray-600">${PROGRAM_INFO[selectedProgram].description}</p>
        </div>
        
        <!-- Package Options - Left-aligned with proper spacing -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mx-0">
            ${packagesHtml}
        </div>
    `;
    
    // Add click handlers
    container.querySelectorAll('.purchase-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lessons = parseInt(e.target.dataset.lessons);
            const price = parseInt(e.target.dataset.price);
            selectPackage(lessons, price);
        });
    });
}