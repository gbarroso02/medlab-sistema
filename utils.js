// Função para fechar qualquer modal de notificação
function closeNotification() {
    const notificationModal = document.getElementById('notification-modal');
    if (notificationModal) {
        notificationModal.classList.add('hidden');
    }
}

// Função para mostrar a notificação (versão melhorada)
function showNotification(title, message, isSuccess = true, isPersistent = false) {
    const notificationModal = document.getElementById('notification-modal');
    if (!notificationModal) {
        alert(title + "\n\n" + message);
        return;
    }
    const modalIconContainer = document.getElementById('modal-icon-container');
    const modalTitleText = document.getElementById('modal-title-text');
    const modalMessageText = document.getElementById('modal-message-text');
    const modalCloseButton = document.getElementById('modal-close-button');
    
    modalTitleText.textContent = title;
    modalMessageText.textContent = message;
    
    // Mostra ou esconde o botão "Ok"
    if (isPersistent) {
        modalCloseButton.classList.add('hidden');
    } else {
        modalCloseButton.classList.remove('hidden');
    }
    
    modalIconContainer.className = `mx-auto flex items-center justify-center h-12 w-12 rounded-full ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`;
    modalIconContainer.innerHTML = isSuccess ?
        `<svg class="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` :
        `<svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>`;

    notificationModal.classList.remove('hidden');
}

// Listener para fechar a notificação ao clicar no botão
document.addEventListener('DOMContentLoaded', () => {
    const modalCloseButton = document.getElementById('modal-close-button');
    if (modalCloseButton) {
        modalCloseButton.addEventListener('click', () => {
            closeNotification();
        });
    }
});