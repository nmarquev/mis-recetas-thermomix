javascript:(function(){
    'use strict';
    console.log('🔖 DEBUG: TasteBox Bookmarklet iniciado');

    // Test simple: abrir ventana de login directamente
    const loginUrl = 'https://tastebox.local:8081/?bookmarklet=true';
    console.log('🔗 DEBUG: Abriendo URL:', loginUrl);

    const loginWindow = window.open(
        loginUrl,
        'tasteboxLoginDebug',
        'width=800,height=600,scrollbars=yes,resizable=yes'
    );

    console.log('🚀 DEBUG: Ventana abierta:', loginWindow);

    // Test de comunicación
    window.addEventListener('message', function(event) {
        console.log('📩 DEBUG: Mensaje recibido en bookmarklet:', event.data);
        if (event.data && event.data.type === 'TASTEBOX_LOGIN_SUCCESS') {
            console.log('✅ DEBUG: Login exitoso detectado!');
            alert('¡Login exitoso detectado por bookmarklet!');
            if (loginWindow && !loginWindow.closed) {
                loginWindow.close();
            }
        }
    });

    console.log('🎯 DEBUG: Bookmarklet configurado, esperando mensajes...');
})();