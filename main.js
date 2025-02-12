let currentSection = 0;
const sections = document.querySelectorAll('.scroll-screen');
const navItems = document.querySelectorAll('.nav-item');
const totalSections = sections.length;
let scrollThreshold = 0;
const requiredThreshold = 20;
const starsContainer = document.querySelector('.stars');
const gradientOrb = document.querySelector('.gradient-orb');

// New variables for splash intro scroll
let introScroll = 0;
const introThreshold = 300; // Increased threshold for slower transition
let introCompleted = false;
const splash = document.getElementById('splash');
const splashText = document.querySelector('.splash-text');

// New variables for the white state transition
let isWhiteState = false;
let spheresCreated = false;

// Set initial star positions
for (let i = 0; i < 50; i++) {
  const x = Math.random() * 100;
  const y = Math.random() * 100;
  starsContainer.style.setProperty('--x', `${x}%`);
  starsContainer.style.setProperty('--y', `${y}%`);
}

// Update gradient orb position with optimization
const updateOrbPosition = (e) => {
  requestAnimationFrame(() => {
    const x = e.clientX;
    const y = e.clientY;
    gradientOrb.style.transform = `translate(${x - 300}px, ${y - 300}px)`;
  });
};

document.addEventListener('mousemove', updateOrbPosition);

// Optimize star movement
document.addEventListener('mousemove', (e) => {
  requestAnimationFrame(() => {
    const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
    starsContainer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
  });
});

function activateSection(index) {
  sections.forEach(section => section.classList.remove('active'));
  navItems.forEach(item => item.classList.remove('active'));
  
  sections[index].classList.add('active');
  navItems[index].classList.add('active');
}

// Add floating particles
function createParticles() {
  const particlesContainer = document.createElement('div');
  particlesContainer.className = 'particles';
  document.body.appendChild(particlesContainer);

  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 20}s`;
    particlesContainer.appendChild(particle);
  }
}

createParticles();

// Enhance star twinkling effect
function twinkleStars() {
  const numStars = 20; 
  for (let i = 0; i < numStars; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const opacity = 0.5 + Math.random() * 0.3;
    const size = 1 + Math.random() * 1.5;
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = `${x}%`;
    star.style.top = `${y}%`;
    star.style.opacity = opacity;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.filter = 'blur(1px)';
    starsContainer.appendChild(star);
    
    setTimeout(() => {
      star.remove();
    }, 2000);
  }
}

setInterval(twinkleStars, 150);

// Enhance smooth scroll animation
function smoothScroll(direction) {
  const targetSection = currentSection + direction;
  if (targetSection >= 0 && targetSection < totalSections) {
    document.body.style.perspective = '2000px';
    sections[currentSection].style.transform = direction > 0 ? 
      'translateZ(-200px) rotateX(5deg)' : 'translateZ(-200px) rotateX(-5deg)';
    sections[currentSection].style.filter = 'blur(5px)';
    
    setTimeout(() => {
      currentSection = targetSection;
      activateSection(currentSection);
      sections.forEach(section => {
        section.style.transform = '';
        section.style.filter = '';
      });
    }, 400);
  }
}

// Enhanced transition animation with depth effect
function updateSplashTransition(progress) {
  // Smoother fade out with depth transition
  const scale = 1 + (progress * 0.1);
  const blur = progress * 8;
  const brightness = 1 - (progress * 0.3);
  
  splash.style.opacity = Math.max(0, 1 - (progress * 1.2));
  splash.style.transform = `scale(${scale})`;
  splash.style.filter = `blur(${blur}px) brightness(${brightness})`;
  
  // Parallax effect for mountain
  const mountainImg = document.querySelector('.mountain-img');
  if (mountainImg) {
    const mountainScale = 1.15 + (progress * 0.1);
    const mountainBlur = progress * 4;
    mountainImg.style.opacity = Math.max(0, 1 - (progress * 1.5));
    mountainImg.style.transform = `scale(${mountainScale}) translateY(${progress * 30}px)`;
    mountainImg.style.filter = `
      blur(${mountainBlur}px)
      drop-shadow(0 15px 25px rgba(0, 0, 0, ${0.5 - progress * 0.3}))
      drop-shadow(0 -8px 20px rgba(0, 0, 0, ${0.4 - progress * 0.2}))
    `;
  }
  
  // Enhanced transition for clouds
  const clouds = document.querySelector('.clouds');
  if (clouds) {
    clouds.style.opacity = Math.max(0, 1 - (progress * 2));
    clouds.style.transform = `translateY(${progress * -50}px)`;
  }
  
  // Enhanced transition for snow
  const snowContainer = document.querySelector('.snow-container');
  if (snowContainer) {
    snowContainer.style.opacity = Math.max(0, 1 - (progress * 2));
    snowContainer.style.transform = `translateY(${progress * -30}px)`;
  }
  
  // Text transition
  splashText.style.opacity = Math.max(0, 1 - (progress * 1.5));
  splashText.style.transform = `translate(-50%, -50%) scale(${1 - progress * 0.2})`;
}

// Update the wheel event listener
window.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  if (!introCompleted) {
    introScroll += e.deltaY;
    introScroll = Math.max(0, Math.min(introScroll, introThreshold));
    const progress = introScroll / introThreshold;
    
    updateSplashTransition(progress);
    
    if (progress === 1) {
      introCompleted = true;
    }
  } else {
    if (currentSection === totalSections - 1 && e.deltaY > 0 && !isWhiteState) {
      // Transition to white state
      transitionToWhiteState();
    } else if (isWhiteState && e.deltaY < 0) {
      // Transition back to dark state
      transitionToDarkState();
    } else {
      if (currentSection === 0 && e.deltaY < 0) {
        introScroll += e.deltaY;
        introScroll = Math.max(0, introScroll);
        const progress = introScroll / introThreshold;
        
        updateSplashTransition(progress);
        
        if (progress < 1) {
          introCompleted = false;
        }
      } else {
        scrollThreshold += (e.deltaY > 0 ? 1 : -1);
        if (Math.abs(scrollThreshold) >= requiredThreshold) {
          const direction = scrollThreshold > 0 ? 1 : -1;
          smoothScroll(direction);
          scrollThreshold = 0;
        }
      }
    }
  }
}, { passive: false });

// Combine touch event handling into one section and remove duplicate declarations
let touchStartY = 0;

function handleTouchStart(e) {
  touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
  const touchEndY = e.changedTouches[0].clientY;
  const delta = touchStartY - touchEndY;
  
  if (!introCompleted) {
    introScroll += delta;
    introScroll = Math.max(0, Math.min(introScroll, introThreshold));
    const progress = introScroll / introThreshold;
    
    updateSplashTransition(progress);
    
    if (progress === 1) {
      introCompleted = true;
    }
  } else {
    if (isWhiteState) {
      const doc = document.querySelector('.documentation');
      if (doc.scrollTop === 0 && touchEndY > touchStartY) {
        transitionToDarkState();
      }
    } else {
      if (currentSection === 0 && delta < 0) { 
        introScroll += delta;
        introScroll = Math.max(0, introScroll);
        const progress = introScroll / introThreshold;
        
        updateSplashTransition(progress);
        
        if (progress < 1) {
          introCompleted = false;
        }
      } else {
        if (Math.abs(delta) > 50) {
          const direction = delta > 0 ? 1 : -1;
          smoothScroll(direction);
        }
      }
    }
  }
}

document.addEventListener('touchstart', handleTouchStart);
document.addEventListener('touchend', handleTouchEnd);

function transitionToWhiteState() {
  isWhiteState = true;
  
  // Fade out existing elements with transform
  document.querySelectorAll('.scroll-screen, .vertical-nav').forEach(el => {
    el.classList.add('fade-out');
  });
  
  // Smoother transition to white background
  setTimeout(() => {
    document.body.classList.add('white-state');
    document.querySelector('.stars').classList.add('white-mode');
    
    // Show documentation with transform and delay
    const documentation = document.querySelector('.documentation');
    documentation.style.display = 'block';
    documentation.style.transform = 'scale(0.95) translateY(30px)';
    documentation.style.opacity = '0';
    
    // Add small delay before fade in with transform
    setTimeout(() => {
      documentation.style.transform = 'scale(1) translateY(0)';
      documentation.style.opacity = '1';
      documentation.classList.add('visible');
    }, 300);
  }, 1500);
}

function transitionToDarkState() {
  isWhiteState = false;
  
  // Hide documentation with transform
  const documentation = document.querySelector('.documentation');
  documentation.style.transform = 'scale(0.95) translateY(-30px)';
  documentation.style.opacity = '0';
  
  setTimeout(() => {
    documentation.classList.remove('visible');
    documentation.style.display = 'none';
    
    document.body.classList.remove('white-state');
    document.querySelector('.stars').classList.remove('white-mode');
    
    // Fade in original elements with transform
    document.querySelectorAll('.scroll-screen, .vertical-nav').forEach(el => {
      el.classList.remove('fade-out');
    });
    
    currentSection = totalSections - 1;
    activateSection(currentSection);
  }, 1500);
}

// Update cloud creation function to add more variety and density
function createClouds() {
  const cloudsContainer = document.querySelector('.clouds');
  
  function createCloud() {
    const cloud = document.createElement('div');
    cloud.className = 'cloud';
    
    const size = 200 + Math.random() * 300; // Larger cloud sizes
    const top = Math.random() * 120; // Spread clouds across entire height, slightly beyond
    const scale = 0.8 + Math.random() * 0.6;
    
    cloud.style.width = `${size}px`;
    cloud.style.height = `${size/2}px`;
    cloud.style.top = `${top}%`;
    cloud.style.animation = `cloudFloat ${20 + Math.random() * 15}s linear`; // Longer animation
    cloud.style.transform = `scale(${scale})`;
    
    cloudsContainer.appendChild(cloud);
    
    cloud.addEventListener('animationend', () => {
      cloud.remove();
    });
  }

  // Create more initial clouds
  for (let i = 0; i < 20; i++) {
    setTimeout(() => createCloud(), i * 500); // More frequent cloud creation
  }

  // Continue creating clouds more frequently
  setInterval(createCloud, 2000); // More frequent cloud generation
}

createClouds();

// Add snow creation function
function createSnowfall() {
  const snowContainer = document.querySelector('.snow-container');
  const numSnowflakes = 100;

  for (let i = 0; i < numSnowflakes; i++) {
    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');

    // Randomize snowflake properties
    const size = Math.random() * 3 + 1; // 1-4px
    const delay = Math.random() * 10; // 0-10s delay
    const duration = Math.random() * 10 + 10; // 10-20s fall duration
    const startPosition = Math.random() * 100; // 0-100% horizontal position

    snowflake.style.width = `${size}px`;
    snowflake.style.height = `${size}px`;
    snowflake.style.left = `${startPosition}%`;
    snowflake.style.animationDelay = `${delay}s`;
    snowflake.style.animationDuration = `${duration}s`;

    // Slight horizontal drift
    const drift = (Math.random() - 0.5) * 40;
    snowflake.style.animation = `snowfall linear infinite`;
    snowflake.style.animationDelay = `${delay}s`;
    snowflake.style.transform = `translateX(${drift}px)`;

    snowContainer.appendChild(snowflake);

    // Remove and recreate snowflake after animation
    snowflake.addEventListener('animationend', () => {
      snowflake.remove();
      createIndividualSnowflake();
    });
  }
}

function createIndividualSnowflake() {
  const snowContainer = document.querySelector('.snow-container');
  const snowflake = document.createElement('div');
  snowflake.classList.add('snowflake');

  const size = Math.random() * 3 + 1;
  const delay = Math.random() * 5;
  const duration = Math.random() * 10 + 10;
  const startPosition = Math.random() * 100;

  snowflake.style.width = `${size}px`;
  snowflake.style.height = `${size}px`;
  snowflake.style.left = `${startPosition}%`;
  snowflake.style.animationDelay = `${delay}s`;
  snowflake.style.animationDuration = `${duration}s`;

  const drift = (Math.random() - 0.5) * 40;
  snowflake.style.animation = `snowfall linear infinite`;
  snowflake.style.animationDelay = `${delay}s`;
  snowflake.style.transform = `translateX(${drift}px)`;

  snowContainer.appendChild(snowflake);

  snowflake.addEventListener('animationend', () => {
    snowflake.remove();
    createIndividualSnowflake();
  });
}

// Call snow creation when page loads
createSnowfall();

// Initialize main content
activateSection(0);

// Enhanced parallax effect for documentation spheres
document.addEventListener('mousemove', (e) => {
  if (!isWhiteState) return;
  
  const spheres = document.querySelectorAll('.parallax-sphere');
  const mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  const mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  
  spheres.forEach((sphere, index) => {
    const depth = (index + 1) * 50;
    const rotateX = mouseY * 15;
    const rotateY = mouseX * -15;
    const translateX = mouseX * depth;
    const translateY = mouseY * depth;
    
    sphere.style.transform = `
      translate3d(${translateX}px, ${translateY}px, ${depth}px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
    `;
  });
});

// Make sure documentation is scrollable
const documentation = document.querySelector('.documentation');
documentation.addEventListener('wheel', (e) => {
  const atTop = documentation.scrollTop === 0;
  const atBottom = documentation.scrollHeight - documentation.scrollTop === documentation.clientHeight;
  
  if (atTop && e.deltaY < 0) {
    e.preventDefault();
    transitionToDarkState();
  } else {
    e.stopPropagation();
  }
});

// Add scroll indicator visibility logic
let scrollTimeout;
const scrollIndicator = document.querySelector('.scroll-indicator');

function showScrollIndicator() {
  scrollIndicator.style.opacity = '1';
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    scrollIndicator.style.opacity = '0';
  }, 3000);
}

// Add event listener for scroll
window.addEventListener('scroll', showScrollIndicator);
document.addEventListener('wheel', showScrollIndicator);
document.addEventListener('touchmove', showScrollIndicator);

// Show initial scroll indicator
setTimeout(showScrollIndicator, 1000);