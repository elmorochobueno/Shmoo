document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const shiftStatus = document.getElementById('shiftStatus');
    const openShiftBtn = document.getElementById('openShiftBtn');
    const closeShiftBtn = document.getElementById('closeShiftBtn');
    const newOrderBtn = document.getElementById('newOrderBtn');
    const mainPanel = document.getElementById('mainPanel');
    const orderPanel = document.getElementById('orderPanel');
    const completeOrderBtn = document.getElementById('completeOrderBtn');
    const cancelOrderBtn = document.getElementById('cancelOrderBtn');
    const totalAmount = document.getElementById('totalAmount');
    const notification = document.getElementById('notification');
    const salesLog = document.getElementById('salesLog');
    const menuItems = document.getElementById('menuItems');
    const productList = document.getElementById('productList');
    const productName = document.getElementById('productName');
    const productPrice = document.getElementById('productPrice');
    const addProductBtn = document.getElementById('addProductBtn');
    const calculateTotalsBtn = document.getElementById('calculateTotalsBtn');
    const cashTotal = document.getElementById('cashTotal');
    const transferTotal = document.getElementById('transferTotal');
    const grandTotal = document.getElementById('grandTotal');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Variables de estado
    let currentOrder = {};
    let shiftData = JSON.parse(localStorage.getItem('shmooShift')) || {
        isOpen: false,
        orders: [],
        products: [
            { name: 'Latte', price: 4800 },
            { name: 'Flat White', price: 4700 },
            { name: 'Capuchino', price: 4500 },
            { name: 'Latte Doble', price: 5000 },
            { name: 'Americano', price: 4400 },
            { name: 'Dopio', price: 3000 },
            { name: 'Leche de almendras', price: 1000 }
        ]
    };

    // Inicializar
    updateUI();
    loadProducts();
    renderMenuItems();

    // Event listeners
    openShiftBtn.addEventListener('click', openShift);
    closeShiftBtn.addEventListener('click', closeShift);
    newOrderBtn.addEventListener('click', startNewOrder);
    completeOrderBtn.addEventListener('click', completeOrder);
    cancelOrderBtn.addEventListener('click', cancelOrder);
    addProductBtn.addEventListener('click', addProduct);
    calculateTotalsBtn.addEventListener('click', calculateCashierTotals);

    // Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Funciones principales
    function openShift() {
        shiftData = {
            ...shiftData,
            isOpen: true,
            orders: [],
            currentShiftStart: new Date().toISOString()
        };
        saveData();
        updateUI();
        showNotification('Turno abierto correctamente');
    }

    function closeShift() {
        if (confirm('¿Estás seguro de cerrar el turno? Se generará un reporte Excel.')) {
            exportToExcel();
            shiftData.isOpen = false;
            saveData();
            updateUI();
            showNotification('Turno cerrado y reporte generado');
        }
    }

    function startNewOrder() {
        currentOrder = {
            paymentMethod: 'cash' // Valor por defecto
        };
        
        shiftData.products.forEach(product => {
            currentOrder[product.name] = 0;
        });
        
        renderOrderQuantities();
        document.getElementById('cash').checked = true;
        updateTotal();
        
        mainPanel.classList.add('hidden');
        orderPanel.classList.remove('hidden');
    }

    function completeOrder() {
        const total = calculateTotal();
        if (total === 0) {
            showNotification('Agrega al menos un producto al pedido', true);
            return;
        }
        
        // Obtener método de pago seleccionado
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        
        const order = {
            items: { ...currentOrder },
            total,
            paymentMethod, // <-- Esto estaba faltando antes
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

    function addProduct() {
        const name = productName.value.trim();
        const price = parseInt(productPrice.value);
        
        if (!name || isNaN(price)) {
            showNotification('Ingresa nombre y precio válidos', true);
            return;
        }
        
        shiftData.products.push({ name, price });
        saveData();
        loadProducts();
        renderMenuItems();
        
        productName.value = '';
        productPrice.value = '';
        showNotification('Producto agregado correctamente');
    }

    function calculateCashierTotals() {
        if (shiftData.orders.length === 0) {
            showNotification('No hay ventas registradas', true);
            return;
        }
        
        let cash = 0;
        let transfer = 0;
        
        shiftData.orders.forEach(order => {
            if (order.paymentMethod === 'cash') {
                cash += order.total;
            } else {
                transfer += order.total;
            }
        });
        
        cashTotal.textContent = `$${cash.toLocaleString()}`;
        transferTotal.textContent = `$${transfer.toLocaleString()}`;
        grandTotal.textContent = `$${(cash + transfer).toLocaleString()}`;
        
        showNotification('Arqueo calculado correctamente');
    }

    // Funciones de UI
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
        
        [...shiftData.orders].reverse().forEach(order => {
            const orderedItems = [];
            for (const [item, quantity] of Object.entries(order.items)) {
                if (quantity > 0) {
                    orderedItems.push(`${item}: ${quantity}`);
                }
            }
            
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

    function renderMenuItems() {
        menuItems.innerHTML = '';
        shiftData.products.forEach(product => {
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            menuItem.innerHTML = `
                <h3>${product.name}</h3>
                <p>$${product.price.toLocaleString()}</p>
                <div class="quantity-control">
                    <button class="quantity-btn" data-item="${product.name}" data-action="decrease">-</button>
                    <span class="quantity" data-item="${product.name}">0</span>
                    <button class="quantity-btn" data-item="${product.name}" data-action="increase">+</button>
                </div>
            `;
            menuItems.appendChild(menuItem);
        });
        
        // Re-asignar eventos a los botones
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
    }

    function renderOrderQuantities() {
        shiftData.products.forEach(product => {
            const quantityEl = document.querySelector(`.quantity[data-item="${product.name}"]`);
            if (quantityEl) {
                quantityEl.textContent = currentOrder[product.name] || 0;
            }
        });
    }

    function loadProducts() {
        productList.innerHTML = '';
        shiftData.products.forEach((product, index) => {
            const productEl = document.createElement('div');
            productEl.className = 'product-item';
            productEl.innerHTML = `
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">$${product.price.toLocaleString()}</div>
                </div>
                <div class="product-actions">
                    <button class="btn danger delete-product" data-index="${index}">Eliminar</button>
                </div>
            `;
            productList.appendChild(productEl);
        });
        
        // Eventos para eliminar productos
        document.querySelectorAll('.delete-product').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                deleteProduct(index);
            });
        });
    }

    function deleteProduct(index) {
        if (confirm(`¿Eliminar "${shiftData.products[index].name}"?`)) {
            shiftData.products.splice(index, 1);
            saveData();
            loadProducts();
            renderMenuItems();
            showNotification('Producto eliminado');
        }
    }

    function updateQuantityDisplay(item) {
        const quantityEl = document.querySelector(`.quantity[data-item="${item}"]`);
        if (quantityEl) {
            quantityEl.textContent = currentOrder[item] || 0;
        }
    }

    function updateTotal() {
        totalAmount.textContent = calculateTotal().toLocaleString();
    }

    function calculateTotal() {
        let total = 0;
        for (const [item, quantity] of Object.entries(currentOrder)) {
            if (item !== 'paymentMethod' && quantity > 0) {
                const product = shiftData.products.find(p => p.name === item);
                if (product) {
                    total += quantity * product.price;
                }
            }
        }
        return total;
    }

    function switchTab(tabId) {
        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    }

    function exportToExcel() {
        if (shiftData.orders.length === 0) {
            showNotification('No hay datos para exportar', true);
            return;
        }
        
        // Crear libro de Excel
        const wb = XLSX.utils.book_new();
        
        // --- Hoja de Resumen ---
        const summaryData = [
            ['RESUMEN DE VENTAS - SHMOO CAFE'],
            ['Fecha', new Date().toLocaleDateString('es-CL')],
            ['Turno iniciado', shiftData.currentShiftStart ? new Date(shiftData.currentShiftStart).toLocaleString('es-CL') : 'N/A'],
            ['Turno cerrado', new Date().toLocaleString('es-CL')],
            [''],
            ['TOTALES POR MÉTODO DE PAGO'],
            ['EFECTIVO', shiftData.orders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0)],
            ['TRANSFERENCIA', shiftData.orders.filter(o => o.paymentMethod === 'transfer').reduce((sum, o) => sum + o.total, 0)],
            ['TOTAL GENERAL', shiftData.orders.reduce((sum, o) => sum + o.total, 0)],
            [''],
            ['PRODUCTOS VENDIDOS'],
            ['Producto', 'Cantidad', 'Total']
        ];
        
        // Calcular resumen por producto
        const productSummary = {};
        shiftData.products.forEach(product => {
            productSummary[product.name] = {
                quantity: 0,
                total: 0
            };
        });
        
        shiftData.orders.forEach(order => {
            for (const [item, quantity] of Object.entries(order.items)) {
                if (quantity > 0) {
                    productSummary[item].quantity += quantity;
                    productSummary[item].total += quantity * shiftData.products.find(p => p.name === item).price;
                }
            }
        });
        
        // Agregar productos al resumen
        Object.entries(productSummary).forEach(([name, data]) => {
            if (data.quantity > 0) {
                summaryData.push([name, data.quantity, data.total]);
            }
        });
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        
        // --- Hoja de Pedidos Detallados ---
        const ordersData = [
            ['N° Pedido', 'Fecha', 'Hora', 'Producto', 'Cantidad', 'Precio Unitario', 'Subtotal', 'Método Pago', 'Total']
        ];
        
        shiftData.orders.forEach(order => {
            let firstRow = true;
            for (const [item, quantity] of Object.entries(order.items)) {
                if (quantity > 0) {
                    const product = shiftData.products.find(p => p.name === item);
                    if (product) {
                        const date = new Date(order.timestamp);
                        ordersData.push([
                            firstRow ? order.orderNumber : '',
                            firstRow ? date.toLocaleDateString('es-CL') : '',
                            firstRow ? date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '',
                            item,
                            quantity,
                            product.price,
                            quantity * product.price,
                            firstRow ? (order.paymentMethod === 'cash' ? 'EFECTIVO' : 'TRANSFERENCIA') : '',
                            firstRow ? order.total : ''
                        ]);
                        firstRow = false;
                    }
                }
            }
        });
        
        const wsOrders = XLSX.utils.aoa_to_sheet(ordersData);
        
        // Agregar hojas al libro
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
        XLSX.utils.book_append_sheet(wb, wsOrders, "Pedidos");
        
        // Generar archivo
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Reporte_ShmooCafe_${dateStr}.xlsx`);
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
