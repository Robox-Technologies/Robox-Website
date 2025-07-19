const gaConsentPopup = document.getElementById("gaConsentPopup") as HTMLElement;

document.getElementById("consentApproveBtn")?.addEventListener("click", () => {
    setConsent(true);
});

document.getElementById("consentRejectBtn")?.addEventListener("click", () => {
    setConsent(false);
});

function setConsent(approved: boolean) {
    // gsap.to("#gaConsentPopup", {
    //     duration: 0.6,
    //     ease: "elastic.in(1.3, 1)",
    //     y: "200%",
    //     onComplete: () => {
            
    //     }
    // });
    
    gaConsentPopup.style.display = "none";
    
    const approvedTag = approved ? 'granted' : 'denied';

    localStorage.setItem("consentMode", JSON.stringify({
        // "Necessary" (only if we are analysing)
        'functionality_storage': approvedTag,
        'security_storage': approvedTag,

        // Analytics
        'analytics_storage': approvedTag,

        // Why use these? Just deny!
        'ad_storage': 'denied',
        'personalisation_storage': 'denied'
    }));
    gtag('consent', 'update', {
        functionality_storage: approvedTag,
        security_storage: approvedTag,
        analytics_storage: approvedTag
    });
}

if (localStorage.getItem("consentMode") == null) {
    gaConsentPopup.style.display = "flex";
}