import React, { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleLoginButton({ onSuccess, onError, text = 'signin_with' }) {
  const buttonRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || initialized.current) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            onSuccess(response.credential);
          } else {
            onError?.('Google Login fehlgeschlagen');
          }
        },
      });
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: buttonRef.current.offsetWidth || 320,
          text: text,
          shape: 'pill',
          logo_alignment: 'center',
        });
      }
      initialized.current = true;
    };

    // Script laden falls nicht vorhanden
    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    } else {
      initGoogle();
    }
  }, [onSuccess, onError, text]);

  if (!GOOGLE_CLIENT_ID) return null;

  return <div ref={buttonRef} className="w-full flex justify-center" />;
}

export default GoogleLoginButton;
