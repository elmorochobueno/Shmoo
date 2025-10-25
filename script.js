document.addEventListener('DOMContentLoaded', function() {
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
    const qrTotal = document.getElementById('qrTotal');
    const transferTotal = document.getElementById('transferTotal');
    const grandTotal = document.getElementById('grandTotal');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    let currentOrder = {};
    let shiftData = JSON.parse(localStorage.getItem('shmooShift')) || {
        isOpen: false,
        orders: [],
        products: [
            { name: 'Latte', price: 4900 },
            { name: 'Latte doble', price: 5100 },
            { name: 'Flat White', price: 4800 },
            { name: 'Capu', price: 4700 },
            { name: 'Americano', price: 4500 },
            { name: 'Doppio', price: 3000 },
            { name: 'Matcha', price: 5300 },
            { name: 'Leche de almendras', price: 1000 },
            { name: 'Extra shot', price: 800 },
            { name: 'Vainilla', price: 300 },
            { name: 'Caramelo', price: 300 },
            { name: 'Latte Frío', price: 4900},
            { name: 'Latte doble Frío', price: 4900},
            { name: 'Cuarto de kg', price: 18000},
        ]
    };

    updateUI();
    loadProducts();
    renderMenuItems();

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
        currentOrder = { paymentMethod: 'cash' };
        shiftData.products.forEach(product => { currentOrder[product.name] = 0; });
        document.querySelectorAll('.product-card .quantity').forEach(el => { el.textContent = '0'; });
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
        let cash = 0, qr = 0, transfer = 0;
        shiftData.orders.forEach(order => {
            if (order.paymentMethod === 'cash') cash += order.total;
            else if (order.paymentMethod === 'qr') qr += order.total;
            else transfer += order.total;
        });
        cashTotal.textContent = `$${cash.toLocaleString()}`;
        qrTotal.textContent = `$${qr.toLocaleString()}`;
        transferTotal.textContent = `$${transfer.toLocaleString()}`;
        grandTotal.textContent = `$${(cash + qr + transfer).toLocaleString()}`;
        showNotification('Arqueo calculado correctamente');
    }

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
                deleteProduct(parseInt(this.getAttribute('data-index')));
            });
        });
        document.querySelectorAll('.edit-product').forEach(btn => {
            btn.addEventListener('click', function() {
                editProduct(parseInt(this.getAttribute('data-index')));
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
                    <div class="product-price">$${product.price.toLocaleString()}</div>
                </div>
                <div class="product-card-footer">
                    <div class="quantity-selector">
                        <button class="qty-btn minus">−</button>
                        <span class="quantity">0</span>
                        <button class="qty-btn plus">+</button>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const card = this.closest('.product-card');
                const productName = card.querySelector('h3').textContent;
                const quantityEl = card.querySelector('.quantity');
                let quantity = parseInt(quantityEl.textContent);
                
                if (this.classList.contains('plus')) quantity++;
                else if (this.classList.contains('minus') && quantity > 0) quantity--;
                
                quantityEl.textContent = quantity;
                currentOrder[productName] = quantity;
                updateTotal();
                
                // Efecto visual al cambiar cantidad
                if (quantity > 0) {
                    quantityEl.style.fontWeight = 'bold';
                    quantityEl.style.color = '#2e68b0';
                } else {
                    quantityEl.style.fontWeight = 'normal';
                    quantityEl.style.color = 'inherit';
                }
            });
        });
    }

    function updateSalesLog() {
        if (shiftData.orders.length === 0) {
            salesLog.innerHTML = '<p class="empty-log">No hay ventas registradas</p>';
            return;
        }
        
        salesLog.innerHTML = [...shiftData.orders].reverse().map((order, index) => {
            const orderedItems = [];
            for (const [item, quantity] of Object.entries(order.items)) {
                if (quantity > 0) orderedItems.push(`${item}: ${quantity}`);
            }
            const orderDate = new Date(order.timestamp);
            const timeString = orderDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
            let method = 'Transferencia';
            if (order.paymentMethod === 'cash') method = 'Efectivo';
            else if (order.paymentMethod === 'qr') method = 'QR';
            
            // Determinar si es la última venta (primera en la lista invertida)
            const isLastSale = index === 0;
            
            return `
                <div class="sale-entry ${isLastSale ? 'last-sale' : ''}">
                    <div class="sale-header ${isLastSale ? 'last-sale-header' : ''}">
                        <span>Pedido #${order.orderNumber}</span>
                        <span>$${order.total.toLocaleString()}</span>
                    </div>
                    <div class="sale-items ${isLastSale ? 'last-sale-items' : ''}">${orderedItems.join(' • ')}</div>
                    <div class="sale-details ${isLastSale ? 'last-sale-details' : ''}">
                        <span>${method}</span>
                        <span>${timeString}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateTotal() { totalAmount.textContent = calculateTotal().toLocaleString(); }
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

    function exportToExcel() {
        if (shiftData.orders.length === 0) {
            showNotification('No hay datos para exportar', true);
            return;
        }
        const wb = XLSX.utils.book_new();
        
        // Hoja 1: Resumen de Ventas
        const summaryData = [
            ['RESUMEN DE VENTAS'],
            ['Fecha', new Date().toLocaleString('es-CL')],
            [],
            ['Pedido', 'Productos', 'Método de Pago', 'Total', 'Hora']
        ];
        
        shiftData.orders.forEach(order => {
            const orderedItems = [];
            for (const [item, quantity] of Object.entries(order.items)) {
                if (quantity > 0) orderedItems.push(`${item}: ${quantity}`);
            }
            const orderDate = new Date(order.timestamp);
            const timeString = orderDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
            let method = 'Transferencia';
            if (order.paymentMethod === 'cash') method = 'Efectivo';
            else if (order.paymentMethod === 'qr') method = 'QR';
            summaryData.push([
                `#${order.orderNumber}`,
                orderedItems.join(', '),
                method,
                order.total,  // Solo el número, sin formato
                timeString
            ]);
        });
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');
        
        // Hoja 2: Estadísticas de Productos
        const productStatsData = [
            ['ESTADÍSTICAS DE PRODUCTOS'],
            ['Fecha', new Date().toLocaleString('es-CL')],
            []
        ];
        
        // Calcular totales por producto
        const productTotals = {};
        shiftData.products.forEach(product => {
            productTotals[product.name] = 0;
        });
        
        shiftData.orders.forEach(order => {
            for (const [productName, quantity] of Object.entries(order.items)) {
                if (quantity > 0) {
                    productTotals[productName] += quantity;
                }
            }
        });
        
        // Definir productos que NO son cafés
        const nonCoffeeItems = [
            'Leche de almendras', 'Vainilla', 'Caramelo', 'Extra shot', 'Cuarto de kg'
        ];
        
        let totalCafes = 0;
        
        // Agregar encabezados
        productStatsData.push(['Producto', 'Cantidad Vendida']);
        productStatsData.push([]);
        
        // Agregar total de cafés primero
        shiftData.products.forEach(product => {
            if (!nonCoffeeItems.includes(product.name)) {
                totalCafes += productTotals[product.name];
            }
        });
        
        productStatsData.push(['TOTAL CAFÉS', totalCafes]);
        productStatsData.push([]);
        
        // Agregar cada producto individual
        shiftData.products.forEach(product => {
            productStatsData.push([product.name, productTotals[product.name]]);
        });
        
        // Agregar total general
        productStatsData.push([]);
        const totalGeneral = Object.values(productTotals).reduce((sum, quantity) => sum + quantity, 0);
        productStatsData.push(['TOTAL GENERAL', totalGeneral]);
        
        const wsStats = XLSX.utils.aoa_to_sheet(productStatsData);
        XLSX.utils.book_append_sheet(wb, wsStats, 'Estadísticas');
        
        const fileName = `ShmooCafe_${new Date().toISOString().split('T')[0]}_Turno.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    function saveData() { localStorage.setItem('shmooShift', JSON.stringify(shiftData)); }
    function showNotification(message, isError = false) {
        notification.textContent = message;
        notification.className = 'notification show ' + (isError ? 'error' : 'success');
        setTimeout(() => { notification.classList.remove('show'); }, 3000);
    }
});
