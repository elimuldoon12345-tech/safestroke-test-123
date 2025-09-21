// ===================================
// WORKING FIX for renderPackages function
// This fixes the narrow card display issue
// ===================================

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
            badge = '<span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">Most Popular</span>';
        } else if (lessons === 8) {
            badge = '<span class="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">Best Value</span>';
        } else {
            badge = '<div class="h-6">&nbsp;</div>';
        }
        
        packagesHtml += `
            <div class="package-card bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:border-blue-500 transition-all hover:-translate-y-1 hover:shadow-xl" style="min-width: 200px;">
                <div class="p-4">
                    <div class="text-center">
                        <!-- Package Size -->
                        <h4 class="text-xl font-bold text-gray-900 mb-2">${lessons} Lessons</h4>
                        
                        <!-- Badge -->
                        <div class="mb-3">
                            ${badge}
                        </div>
                        
                        <!-- Price Section WITH DOLLAR SIGNS -->
                        <div class="mb-4">
                            <div class="text-3xl font-black text-gray-900">$${price}</div>
                            <div class="text-xs text-gray-500 mt-1">$${perLesson} per lesson</div>
                        </div>
                        
                        <!-- Button -->
                        <button class="purchase-btn w-full brand-blue-bg hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full text-sm transition-all shadow-md hover:shadow-lg"
                                data-lessons="${lessons}" 
                                data-price="${price}">
                            Select Package
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Remove the left-side text and center everything
    container.innerHTML = `
        <div class="w-full">
            <div class="text-center mb-4">
                <h3 class="text-xl font-bold">${selectedProgram} Packages</h3>
                <p class="text-sm text-gray-600">${PROGRAM_INFO[selectedProgram].description}</p>
            </div>
            
            <!-- Package Options - Flexible layout that spreads across available space -->
            <div class="flex justify-center gap-6" style="width: 100%;">
                ${packagesHtml}
            </div>
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