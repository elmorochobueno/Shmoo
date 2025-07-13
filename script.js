document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const shiftStatus = document.getElementById('shiftStatus');
    const openShiftBtn = document.getElementById('openShiftBtn');
    const closeShiftBtn = document.getElementById('closeShiftBtn');
    const newOrderBtn = document.getElementById('newOrderBtn');
    const exportBtn = document.getElementById('exportBtn');
    const mainPanel = document.getElementById('mainPanel');
    const orderPanel = document.getElementById('orderPanel');
    const completeOrderBtn = document.getElementById('completeOrderBtn');
    const cancelOrderBtn = document.getElementById('cancelOrderBtn');
    const totalAmount = document.getElementById('totalAmount');
    const notification = document.getElementById('notification');
    const salesLog = document.getElementById('salesLog');
    
    // Variables de estado
    let currentOrder = {
        latte: 0,
        flatWhite: 0,
        paymentMethod: 'cash'
    };
    
    // Precios
    const prices = {
        latte: 4800,
        flatWhite: 4700
    };
    
    // Cargar datos guardados
    let shiftData = JSON.parse(localStorage.getItem('shmooShift')) || {
        isOpen: false,
        orders: [],
        currentShiftStart: null
    };
    
    // Inicializar interfaz
    updateUI();
    
    // Event listeners
    openShiftBtn.addEventListener('click', openShift);
    closeShiftBtn.addEventListener('click', closeShift);
    newOrderBtn.addEventListener('click', startNewOrder);
    completeOrderBtn.addEventListener('click', completeOrder);
    cancelOrderBtn.addEventListener('click', cancelOrder);
    exportBtn.addEventListener('click', exportData);
    
    // Botones de cantidad
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.getAttribute('data-item');
            const action = this.getAttribute('data-action');
            
            if (action === 'increase') {
                currentOrder[item]++;
            } else if (action === 'decrease' && currentOrder[item] > 0) {
                currentOrder[item]--;
            }
            
            updateQuantityDisplay(item);
            updateTotal();
        });
    });
    
    // Métodos de pago
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentOrder.paymentMethod = this.value;
        });
    });
    
    // Funciones principales
    function openShift() {
        shiftData = {
            isOpen: true,
            orders: [],
            currentShiftStart: new Date().toISOString()
        };
        saveData();
        updateUI();
        showNotification('Turno abierto correctamente');
    }
    
    function closeShift() {
        if (confirm('¿Estás seguro de cerrar el turno? Se borrarán los datos locales.')) {
            shiftData.isOpen = false;
            saveData();
            updateUI();
            showNotification('Turno cerrado');
        }
    }
    
    function startNewOrder() {
        currentOrder = {
            latte: 0,
            flatWhite: 0,
            paymentMethod: 'cash'
        };
        
        document.querySelectorAll('.quantity').forEach(el => {
            el.textContent = '0';
        });
        
        document.getElementById('cash').checked = true;
        updateTotal();
        
        mainPanel.classList.add('hidden');
        orderPanel.classList.remove('hidden');
    }
    
    function completeOrder() {
        const total = calculateTotal();
        if (total === 0) {
            showNotification('Agrega al menos un café al pedido', true);
            return;
        }
        
        const order = {
            ...currentOrder,
            total,
            timestamp: new Date().toISOString(),
            orderNumber: shiftData.orders.length + 1
        };
        
        shiftData.orders.push(order);
        saveData();
        
        showNotification(`Pedido #${order.orderNumber} completado. Total: $${total.toLocaleString()}`);
        mainPanel.classList.remove('hidden');
        orderPanel.classList.add('hidden');
        
        updateSalesLog();
    }
    
    function cancelOrder() {
        if (confirm('¿Cancelar este pedido?')) {
            mainPanel.classList.remove('hidden');
            orderPanel.classList.add('hidden');
        }
    }
    
    function exportData() {
        if (shiftData.orders.length === 0) {
            showNotification('No hay datos para exportar', true);
            return;
        }
        
        const dataStr = JSON.stringify(shiftData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `shmoo_cafe_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showNotification('Datos exportados correctamente');
    }
    
    // Funciones auxiliares
    function updateUI() {
        shiftStatus.textContent = shiftData.isOpen ? 'Turno abierto' : 'Turno cerrado';
        shiftStatus.className = shiftData.isOpen ? 'shift-status open' : 'shift-status';
        
        openShiftBtn.disabled = shiftData.isOpen;
        newOrderBtn.disabled = !shiftData.isOpen;
        closeShiftBtn.disabled = !shiftData.isOpen;
        
        updateSalesLog();
    }
    
    function updateSalesLog() {
        if (shiftData.orders.length === 0) {
            salesLog.innerHTML = '<p class="empty-log">No hay ventas registradas en este turno</p>';
            return;
        }
        
        salesLog.innerHTML = '';
        
        // Mostrar órdenes más recientes primero
        [...shiftData.orders].reverse().forEach(order => {
            const orderedItems = [];
            if (order.latte > 0) orderedItems.push(`Latte: ${order.latte}`);
            if (order.flatWhite > 0) orderedItems.push(`Flat White: ${order.flatWhite}`);
            
            const orderDate = new Date(order.timestamp);
            const timeString = orderDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
            
            const paymentMethod = order.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia';
            
            const saleEntry = document.createElement('div');
            saleEntry.className = 'sale-entry';
            saleEntry.innerHTML = `
                <div class="sale-header">
                    <span>Pedido #${order.orderNumber}</span>
                    <span>$${order.total.toLocaleString()}</span>
                </div>
                <div class="sale-items">${orderedItems.join(' • ')}</div>
                <div class="sale-details">
                    <span>${paymentMethod}</span>
                    <span>${timeString}</span>
                </div>
            `;
            
            salesLog.appendChild(saleEntry);
        });
    }
    
    function updateQuantityDisplay(item) {
        document.querySelector(`.quantity[data-item="${item}"]`).textContent = currentOrder[item];
    }
    
    function updateTotal() {
        totalAmount.textContent = calculateTotal().toLocaleString();
    }
    
    function calculateTotal() {
        return (currentOrder.latte * prices.latte) + (currentOrder.flatWhite * prices.flatWhite);
    }
    
    function showNotification(message, isError = false) {
        notification.textContent = message;
        notification.className = 'notification' + (isError ? ' error' : '');
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    function saveData() {
        localStorage.setItem('shmooShift', JSON.stringify(shiftData));
    }
});