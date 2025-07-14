document.addEventListener('DOMContentLoaded', function() {
    // ======================
    // ELEMENTOS DEL DOM
    // ======================
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

    // ======================
    // ESTADO INICIAL
    // ======================
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
            { name: 'Doppio', price: 3000 },
            { name: 'Leche de almendras', price: 1000 }
        ]
    };

    // ======================
    // INICIALIZACIÓN
    // ======================
    updateUI();
    loadProducts();
    renderMenuItems();

    // ======================
    // EVENT LISTENERS
    // ======================
    openShiftBtn.addEventListener('click', openShift);
    closeShiftBtn.addEventListener('click', closeShift);
    newOrderBtn.addEventListener('click', startNewOrder);
    completeOrderBtn.addEventListener('click', completeOrder);
    cancelOrderBtn.addEventListener('click', cancelOrder);
    addProductBtn.addEventListener('click', addProduct);
    calculateTotalsBtn.addEventListener('click', calculateCashierTotals);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // ======================
    // FUNCIONES PRINCIPALES
    // ======================

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
            paymentMethod: 'cash'
        };
        
        shiftData.products.forEach(product => {
            currentOrder[product.name] = 0;
        });
        
        document.querySelectorAll('.product-card .quantity').forEach(el => {
            el.textContent = '0';
        });
        
        document.querySelector('input[name="payment"][value="cash"]').checked = true;
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
        
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        
        const order = {
            items: { ...currentOrder },
            total,
            paymentMethod,
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

    // ======================
    // FUNCIONES DE PRODUCTOS
    // ======================

    function loadProducts() {
        productList.innerHTML = shiftData.products.map((product, index) => `
            <div class="product-item">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">$${product.price.toLocaleString()}</div>
                </div>
                <div class="product-actions">
                    <button class="btn edit-product" data-index="${index}">Editar</button>
                    <button class="btn danger delete-product" data-index="${index}">Eliminar</button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.delete-product').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                deleteProduct(index);
            });
        });

        document.querySelectorAll('.edit-product').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                editProduct(index);
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

    function editProduct(index) {
        const newPrice = prompt(`Editar precio de "${shiftData.products[index].name}"`, shiftData.products[index].price);
        if (newPrice && !isNaN(newPrice)) {
            shiftData.products[index].price = parseInt(newPrice);
            saveData();
            loadProducts();
            renderMenuItems();
            showNotification('Precio actualizado');
        }
    }

    // ======================
    // FUNCIONES DE UI
    // ======================

    function updateUI() {
        shiftStatus.textContent = shiftData.isOpen ? 'Turno abierto' : 'Turno cerrado';
        shiftStatus.className = shiftData.isOpen ? 'shift-status open' : 'shift-status';
        
        openShiftBtn.disabled = shiftData.isOpen;
        newOrderBtn.disabled = !shiftData.isOpen;
        closeShiftBtn.disabled = !shiftData.isOpen;
        
        updateSalesLog();
    }

    function renderMenuItems() {
        menuItems.innerHTML = shiftData.products.map(product => `
            <div class="product-card" data-id="${product.name}">
                <div class="product-info">
                    <h3>${product.name}</h3>
                </div>
                <div class="product-price">$${product.price.toLocaleString()}</div>
                <div class="quantity-selector">
                    <button class="qty-btn minus">−</button>
                    <span class="quantity">0</span>
                    <button class="qty-btn plus">+</button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const card = this.closest('.product-card');
                const productName = card.querySelector('h3').textContent;
                const quantityEl = card.querySelector('.quantity');
                let quantity = parseInt(quantityEl.textContent);

                if (this.classList.contains('plus')) {
                    quantity++;
                } else if (this.classList.contains('minus') && quantity > 0) {
                    quantity--;
                }

                quantityEl.textContent = quantity;
                currentOrder[productName] = quantity;
                updateTotal();
            });
        });
    }

    function updateSalesLog() {
        if (shiftData.orders.length === 0) {
            salesLog.innerHTML = '<p class="empty-log">No hay ventas registradas</p>';
            return;
        }
        
        salesLog.innerHTML = [...shiftData.orders].reverse().map(order => {
            const orderedItems = [];
            for (const [item, quantity] of Object.entries(order.items)) {
                if (quantity > 0) {
                    orderedItems.push(`${item}: ${quantity}`);
                }
            }
            
            const orderDate = new Date(order.timestamp);
            const timeString = orderDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
            const paymentMethod = order.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia';
            
            return `
                <div class="sale-entry">
                    <div class="sale-header">
                        <span>Pedido #${order.orderNumber}</span>
                        <span>$${order.total.toLocaleString()}</span>
                    </div>
                    <div class="sale-items">${orderedItems.join(' • ')}</div>
                    <div class="sale-details">
                        <span>${paymentMethod}</span>
                        <span>${timeString}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateTotal() {
        totalAmount.textContent = calculateTotal().toLocaleString();
    }

    function calculateTotal() {
        return shiftData.products.reduce((total, product) => {
            return total + ((currentOrder[product.name] || 0) * product.price);
        }, 0);
    }

    function switchTab(tabId) {
        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    }

    // ======================
    // EXPORTACIÓN EXCEL
    // ======================

    function exportToExcel() {
        if (shiftData.orders.length === 0) {
            showNotification('No hay datos para exportar', true);
            return;
        }
        
        const wb = XLSX.utils.book_new();
        
        // Hoja de Resumen
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
        
        // Resumen por producto
        const productSummary = {};
        shiftData.products.forEach(product => {
            productSummary[product.name] = { quantity: 0, total: 0 };
        });
        
        shiftData.orders.forEach(order => {
            for (const [item, quantity] of Object.entries(order.items)) {
                if (quantity > 0) {
                    const product = shiftData.products.find(p => p.name === item);
                    if (product) {
                        productSummary[item].quantity += quantity;
                        productSummary[item].total += quantity * product.price;
                    }
                }
            }
        });
        
        Object.entries(productSummary).forEach(([name, data]) => {
            if (data.quantity > 0) {
                summaryData.push([name, data.quantity, data.total]);
            }
        });
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Hoja de Pedidos Detallados
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
        
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
        XLSX.utils.book_append_sheet(wb, wsOrders, "Pedidos");
        
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Reporte_ShmooCafe_${dateStr}.xlsx`);
    }

    // ======================
    // FUNCIONES AUXILIARES
    // ======================

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
