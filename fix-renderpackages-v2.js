// Fixed renderPackages function with proper width and spacing

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
            badge = '<span class="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">Most Popular</span>';
        } else if (lessons === 8) {
            badge = '<span class="inline-block bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">Best Value</span>';
        } else {
            badge = '<div class="h-8">&nbsp;</div>';
        }
        
        packagesHtml += `
            <div class="package-card bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:border-blue-500 transition-all hover:-translate-y-1 hover:shadow-xl w-full">
                <div class="p-6">
                    <div class="text-center">
                        <!-- Package Size -->
                        <h4 class="text-2xl font-bold text-gray-900 mb-3">${lessons} Lessons</h4>
                        
                        <!-- Badge -->
                        <div class="mb-4">
                            ${badge}
                        </div>
                        
                        <!-- Price Section -->
                        <div class="mb-6">
                            <div class="text-4xl font-black text-gray-900">$${price}</div>
                            <div class="text-sm text-gray-500 mt-1">$${perLesson} per lesson</div>
                        </div>
                        
                        <!-- Button -->
                        <button class="purchase-btn w-full brand-blue-bg hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full text-base transition-all shadow-md hover:shadow-lg"
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
        <div class="text-center mb-6">
            <h3 class="text-xl font-bold">${selectedProgram} Packages</h3>
            <p class="text-gray-600">${PROGRAM_INFO[selectedProgram].description}</p>
        </div>
        
        <!-- Package Options - Full width grid with proper spacing -->
        <div class="w-full grid grid-cols-3 gap-4" style="min-width: 100%;">
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