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

    const products = [
        {name: "Latte", price: 4900},
        {name: "Latte caramelo", price: 5200},
        {name: "Latte vainilla", price: 5200},
        {name: "Latte doble", price: 5100},
        {name: "Flat White", price: 4800},
        {name: "Capu", price: 4700},
        {name: "Americano", price: 4500},
        {name: "Doppio", price: 3000},
        {name: "Matcha", price: 5300},
        {name: "Leche de almendras", price: 1000},
        {name: "Shot extra", price: 800}
    ];

    let shiftData = { orders: [] };

    function showNotification(message, type="success") {
        notification.textContent = message;
        notification.className = `notification show ${type}`;
        setTimeout(() => notification.className = 'notification', 2500);
    }

    function renderMenu() {
        const menuGrid = document.getElementById('menuGrid');
        menuGrid.innerHTML = '';
        products.forEach((product, idx) => {
            const card = document.createElement('div');
            card.classList.add('product-card');

            const info = document.createElement('div');
            info.classList.add('product-info');
            info.innerHTML = `<h3>${product.name}</h3>`;

            const price = document.createElement('div');
            price.classList.add('product-price');
            price.textContent = `$${product.price}`;

            const qtySelector = document.createElement('div');
            qtySelector.classList.add('quantity-selector');
            const minusBtn = document.createElement('button');
            minusBtn.classList.add('qty-btn');
            minusBtn.textContent = "-";
            const qty = document.createElement('div');
            qty.classList.add('quantity');
            qty.textContent = "0";
            const plusBtn = document.createElement('button');
            plusBtn.classList.add('qty-btn');
            plusBtn.textContent = "+";

            qtySelector.append(minusBtn, qty, plusBtn);
            card.append(info, price, qtySelector);
            menuGrid.appendChild(card);

            plusBtn.addEventListener('click', () => {
                qty.textContent = parseInt(qty.textContent) + 1;
                updateTotal();
            });
            minusBtn.addEventListener('click', () => {
                if(parseInt(qty.textContent) > 0) {
                    qty.textContent = parseInt(qty.textContent) - 1;
                    updateTotal();
                }
            });
        });
    }

    function updateTotal() {
        const quantities = document.querySelectorAll('.quantity');
        let total = 0;
        quantities.forEach((qty, idx) => {
            total += parseInt(qty.textContent) * products[idx].price;
        });
        totalAmount.textContent = `$${total}`;
    }

    function completeOrder() {
        const quantities = document.querySelectorAll('.quantity');
        let order = { items: [], total: 0 };
        quantities.forEach((qty, idx) => {
            const q = parseInt(qty.textContent);
            if(q > 0) {
                order.items.push({name: products[idx].name, quantity: q});
                order.total += q * products[idx].price;
            }
        });
        if(order.items.length === 0) return showNotification("No hay productos seleccionados", "error");

        shiftData.orders.push(order);
        renderSalesLog();
        showNotification("Pedido registrado");
        document.querySelectorAll('.quantity').forEach(q => q.textContent = "0");
        updateTotal();
    }

    function renderSalesLog() {
        salesLog.innerHTML = '';
        if(shiftData.orders.length === 0) {
            salesLog.innerHTML = '<p class="empty-log">No hay ventas registradas</p>';
            return;
        }
        shiftData.orders.forEach((order, index) => {
            const saleDiv = document.createElement('div');
            saleDiv.classList.add('sale-entry');
            if(index === shiftData.orders.length -1){
                saleDiv.style.transform = 'scale(1.2)';
                saleDiv.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
            }

            const header = document.createElement('div');
            header.classList.add('sale-header');
            header.textContent = `Pedido #${index + 1}`;

            const items = document.createElement('div');
            items.classList.add('sale-items');
            items.textContent = order.items.map(i => `${i.name} x${i.quantity}`).join(', ');

            const total = document.createElement('div');
            total.classList.add('sale-details');
            total.textContent = `$${order.total}`;

            saleDiv.append(header, items, total);
            salesLog.appendChild(saleDiv);
        });
    }

    renderMenu();
    completeOrderBtn.addEventListener('click', completeOrder);
});
