// ===================================
// ACTUAL WORKING FIX for renderPackages function
// This properly uses the existing container and spreads cards
// ===================================

function renderPackages() {
    const container = document.getElementById('package-container');
    const pricing = PACKAGE_PRICING[selectedProgram];
    
    // Clear existing content but keep the container's classes
    container.innerHTML = '';
    
    // Add a title section before the cards
    const titleDiv = document.createElement('div');
    titleDiv.className = 'col-span-full text-center mb-6';
    titleDiv.innerHTML = `
        <h3 class="text-2xl font-bold">${selectedProgram} Packages</h3>
        <p class="text-gray-600">${PROGRAM_INFO[selectedProgram].description}</p>
    `;
    container.appendChild(titleDiv);
    
    // Create package cards
    [4, 6, 8].forEach(lessons => {
        const price = pricing[lessons];
        const perLesson = Math.floor(price / lessons);
        
        let badge = '';
        let badgeClasses = '';
        if (lessons === 6) {
            badge = 'Most Popular';
            badgeClasses = 'bg-blue-100 text-blue-800';
        } else if (lessons === 8) {
            badge = 'Best Value';
            badgeClasses = 'bg-green-100 text-green-800';
        }
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:border-blue-500 transition-all hover:-translate-y-1 hover:shadow-xl p-6';
        cardDiv.innerHTML = `
            <div class="text-center h-full flex flex-col justify-between">
                <!-- Package Size -->
                <div>
                    <h4 class="text-2xl font-bold text-gray-900 mb-3">${lessons} Lessons</h4>
                    
                    <!-- Badge -->
                    ${badge ? `
                        <span class="${badgeClasses} text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">
                            ${badge}
                        </span>
                    ` : '<div class="h-8 mb-4"></div>'}
                </div>
                
                <!-- Price Section -->
                <div class="my-4">
                    <div class="text-4xl font-black text-gray-900">$${price}</div>
                    <div class="text-sm text-gray-500 mt-2">$${perLesson} per lesson</div>
                </div>
                
                <!-- Button -->
                <button class="purchase-btn w-full brand-blue-bg hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full text-base transition duration-300 transform hover:scale-105 shadow-lg mt-4"
                        data-lessons="${lessons}" 
                        data-price="${price}">
                    Select Package
                </button>
            </div>
        `;
        
        container.appendChild(cardDiv);
    });
    
    // Add click handlers to all purchase buttons
    container.querySelectorAll('.purchase-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lessons = parseInt(e.target.dataset.lessons);
            const price = parseInt(e.target.dataset.price);
            selectPackage(lessons, price);
        });
    });
}