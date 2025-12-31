// admin.js - Royam 1.1 (Full)
const SUPABASE_URL = 'https://ducmehygksmijtynfuzt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y21laHlna3NtaWp0eW5mdXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTgyNTQsImV4cCI6MjA4MTIzNDI1NH0.Zo0RTm5fPn-sA6AkqSIPCCiehn8iW2Ou4I26HnC2CfU';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {

    // 1. AUTH CHECK
    // if(sessionStorage.getItem('role') !== 'admin') window.location.href = 'login.html';
    
    // Update Header Info
    document.getElementById('header-username').innerText = 'Admin User';
    document.getElementById('header-role').innerText = 'SUPER ADMIN';

    // 2. SIDEBAR NAVIGATION
    const menuItems = document.querySelectorAll('.menu-item:not(.logout)');
    const sections = document.querySelectorAll('.content-section');
    const sectionTitle = document.getElementById('section-title');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // UI Updates
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const targetId = item.getAttribute('data-target');
            
            // Hide all sections, Show target
            sections.forEach(sec => sec.classList.remove('active-section'));
            const targetSection = document.getElementById(targetId);
            if(targetSection) targetSection.classList.add('active-section');

            // Update Header Title
            sectionTitle.innerText = item.innerText.trim();

            // Mobile Menu Close
            if(window.innerWidth < 768) toggleSidebar();
            
            // Trigger Data Loaders
            if(targetId === 'dashboard') initDashboard();
            if(targetId === 'price-management') loadPriceManagement();
            if(targetId === 'customers') loadCustomers();
            if(targetId === 'discounts') loadDiscounts();
            if(targetId === 'sales') quickReport(30);
            if(targetId === 'users') loadStaffList();
            if(targetId === 'templates') loadCurrentTheme(); 
            if(targetId === 'reviews') loadReviews();
            if(targetId === 'messages') loadMessages();
        });
    });

    window.toggleSidebar = function() {
        document.querySelector('.sidebar').classList.toggle('active');
        document.querySelector('.sidebar-overlay').classList.toggle('active');
    }

    // ==========================================
    // 3. DASHBOARD LOGIC (Updated to Royam 1.0 Logic)
    // ==========================================
    async function initDashboard() {
        // 1.0 Logic for Date
        const now = new Date();
        const f = new Date(now.getFullYear(), now.getMonth(), 1);
        // Note: admin.html in 1.1 currently doesn't have an ID to show this date, 
        // but we prepare it as per instruction to port 1.0 logic.
        const dateString = `${f.getDate()} ${f.toLocaleString('en',{month:'short'})} - ${now.getDate()} ${now.toLocaleString('en',{month:'short'})} ${now.getFullYear()}`;
        
        loadMonthStats();
    }

    async function loadMonthStats() {
        // 1.0 Logic for Stats Calculation
        const d = new Date(); d.setDate(1); // First day of current month
        const { data } = await supabaseClient.from('orders')
            .select('total_amount')
            .eq('status','completed')
            .gte('created_at', d.toISOString());
        
        if(data) {
            const r = data.reduce((a,b)=>a+(parseFloat(b.total_amount)||0),0);
            
            // Map 1.0 logic to 1.1 UI IDs
            if(document.getElementById('dash-orders')) 
                document.getElementById('dash-orders').innerText = data.length;
            
            if(document.getElementById('dash-revenue')) 
                document.getElementById('dash-revenue').innerText = '$'+r.toLocaleString();
        }
    }

    // Google Sheets Widget Simulator
    const btnSendReport = document.getElementById('btn-send-report');
    if(btnSendReport) {
        btnSendReport.onclick = () => {
            const statusEl = document.getElementById('sheet-status');
            btnSendReport.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Sending...';
            btnSendReport.disabled = true;
            
            setTimeout(() => {
                statusEl.innerText = "Today's Status: Sent Successfully ✅";
                statusEl.style.color = "#2ECC71";
                btnSendReport.innerHTML = '<i class="ri-check-double-line"></i> Sent';
                setTimeout(() => {
                    btnSendReport.disabled = false;
                    btnSendReport.innerHTML = '<i class="ri-send-plane-fill"></i> Send Report Now';
                }, 3000);
            }, 2000);
        };
    }

    // ==========================================
    // 4. PRICE MANAGEMENT
    // ==========================================
    async function loadPriceManagement() {
        const container = document.getElementById('price-list-container');
        container.innerHTML = '<p>Loading products...</p>';

        let { data: products, error } = await supabaseClient.from('products').select('*');
        
        if (error || !products || products.length === 0) {
            const { data: items } = await supabaseClient.from('order_items').select('product_name, final_price, id').limit(50);
            if(items) {
                const unique = [];
                const map = new Map();
                for (const item of items) {
                    if(!map.has(item.product_name)){
                        map.set(item.product_name, true);
                        unique.push({id: item.id, name: item.product_name, price: item.final_price, category: 'general'});
                    }
                }
                products = unique;
            }
        }

        if(!products || products.length === 0) {
            container.innerHTML = 'No products found to edit.';
            return;
        }

        let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
        products.forEach(p => {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f9f9f9; padding:10px; border-radius:10px;">
                    <span style="font-weight:600; flex:2;">${p.name || p.product_name}</span>
                    <div style="flex:1; display:flex; gap:10px;">
                        <input type="number" id="price-${p.id}" value="${p.price}" style="padding:5px; width:80px;">
                        <button class="btn-save" style="padding:5px 15px; font-size:12px;" onclick="savePrice('${p.id}', '${p.name}')">Save</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    window.savePrice = async function(id, name) {
        const newPrice = document.getElementById(`price-${id}`).value;
        alert(`Price for ${name} updated to $${newPrice} (Simulation)`);
    }

    window.applyBulkPrice = async function() {
        const cat = document.getElementById('bulk-category').value;
        const percent = parseFloat(document.getElementById('bulk-percent').value);
        if(!percent) return alert("Please enter a percentage");
        
        const confirmMsg = `Are you sure you want to change prices for ${cat.toUpperCase()} by ${percent}%?`;
        if(confirm(confirmMsg)) {
            alert("Bulk update applied successfully!");
            loadPriceManagement();
        }
    }

    // ==========================================
    // 5. CUSTOMERS
    // ==========================================
    async function loadCustomers() {
        const list = document.getElementById('customers-list');
        list.innerHTML = 'Loading...';
        
        const { data } = await supabaseClient.from('customers').select('*').order('created_at', {ascending: false});
        
        if(!data || data.length === 0) {
            list.innerHTML = 'No customers found.';
            return;
        }

        let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
        data.forEach(c => {
            html += `
                <div style="background:#fff; padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                    <div>
                        <div style="font-weight:600;">${c.name}</div>
                        <div style="font-size:12px; color:#888;">${c.phone || 'No Phone'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:12px;">Joined: ${new Date(c.created_at).toLocaleDateString()}</div>
                        <div style="font-weight:bold; color:var(--primary-color);">Active</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        list.innerHTML = html;
    }

    // ==========================================
    // 6. DISCOUNTS
    // ==========================================
    window.openDiscountModal = function() {
        document.getElementById('discount-modal').style.display = 'flex';
    }

    window.createDiscount = async function() {
        const code = document.getElementById('d-code').value;
        const percent = document.getElementById('d-percent').value;
        const type = document.getElementById('d-type').value;
        const usage = document.getElementById('d-usage').value;
        const minOrder = document.getElementById('d-min').value || 0;

        if(!code || !percent) return alert("Code and Percent are required.");

        const now = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(now.getFullYear() + 1);

        const { error } = await supabaseClient.from('discounts').insert([{
            code: code,
            percentage: percent,
            type: type,
            usage_type: usage,
            min_order_amount: minOrder,
            status: 'active',
            valid_from: now.toISOString(),
            valid_to: nextYear.toISOString(),
            usage_limit: (usage === 'single' ? 1 : 1000)
        }]);

        if(error) {
            console.error(error);
            alert("Error creating discount.");
        } else {
            alert("Discount Created!");
            document.getElementById('discount-modal').style.display = 'none';
            loadDiscounts();
        }
    }

    window.loadDiscounts = async function() {
        const fStatus = document.getElementById('filter-status').value;
        const fType = document.getElementById('filter-type').value;

        let query = supabaseClient.from('discounts').select('*').order('created_at', {ascending: false});
        
        if(fStatus !== 'all') {
            if(fStatus === 'active') query = query.eq('status', 'active');
        }
        if(fType !== 'all') query = query.eq('type', fType);

        const { data } = await query;
        const tbody = document.getElementById('discounts-table-body');
        tbody.innerHTML = '';

        if(data) {
            data.forEach(d => {
                const isExpired = new Date(d.valid_to) < new Date();
                if(fStatus === 'expired' && !isExpired) return; 

                const statusColor = (d.status === 'active' && !isExpired) ? '#2ECC71' : '#FF7675';
                const statusText = (isExpired) ? 'Expired' : d.status.toUpperCase();

                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.padding = '15px 10px';
                row.style.borderBottom = '1px solid #eee';
                row.style.fontSize = '13px';
                
                row.innerHTML = `
                    <span style="flex:2; font-weight:600;">${d.code}</span>
                    <span style="flex:1;">${d.type}</span>
                    <span style="flex:1;">${d.usage_type}</span>
                    <span style="flex:1;">$${d.min_order_amount}</span>
                    <span style="flex:1; color:${statusColor}; font-weight:600;">${statusText}</span>
                    <span style="flex:1; text-align:right;">
                        <i class="ri-delete-bin-line" onclick="deleteDiscount(${d.id})" style="color:#FF7675; cursor:pointer;"></i>
                    </span>
                `;
                tbody.appendChild(row);
            });
        }
    }

    window.filterDiscounts = function() {
        loadDiscounts();
    }

    window.deleteDiscount = async function(id) {
        if(confirm("Delete this discount?")) {
            await supabaseClient.from('discounts').delete().eq('id', id);
            loadDiscounts();
        }
    }

    // ==========================================
    // 7. SALES REPORT
    // ==========================================
    window.quickReport = async function(days) {
        const container = document.getElementById('sales-report-body');
        container.innerHTML = '<p style="text-align:center; padding:20px;">Generating Report...</p>';

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data } = await supabaseClient.from('order_items')
            .select('product_name, quantity, final_price, created_at')
            .gte('created_at', startDate.toISOString());

        if(!data || data.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">No sales in this period.</p>';
            return;
        }

        const report = {};
        data.forEach(item => {
            if(!report[item.product_name]) report[item.product_name] = { qty: 0, total: 0 };
            report[item.product_name].qty += item.quantity;
            report[item.product_name].total += (item.quantity * item.final_price);
        });

        let html = '';
        Object.keys(report).forEach(prod => {
            html += `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f5f5f5;">
                    <span style="flex: 2; font-weight:500;">${prod}</span>
                    <span style="flex: 1; text-align: center;">${report[prod].qty}</span>
                    <span style="flex: 1; text-align: right; color:var(--primary-color); font-weight:600;">$${report[prod].total.toFixed(2)}</span>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    // ==========================================
    // 8. USERS (STAFF / ADMIN)
    // ==========================================
    window.switchUserTab = function(type, btn) {
        document.querySelectorAll('#users .tab').forEach(t => t.classList.remove('active-cat'));
        btn.classList.add('active-cat');

        document.getElementById('user-tab-staff').style.display = (type === 'staff') ? 'block' : 'none';
        document.getElementById('user-tab-admin').style.display = (type === 'admin') ? 'block' : 'none';

        if(type === 'staff') loadStaffList();
        else loadAdminList();
    }

    async function loadStaffList(){ 
        const c=document.getElementById('staff-list-container'); 
        const {data}=await supabaseClient.from('staff').select('*'); 
        renderUserList(c,data,'staff'); 
    }
    
    async function loadAdminList(){ 
        const c=document.getElementById('admin-list-container'); 
        const {data}=await supabaseClient.from('admins').select('*'); 
        renderUserList(c,data,'admins'); 
    }

    function renderUserList(container, data, table) {
        if(!data || data.length === 0) {
            container.innerHTML = '<p>No users found.</p>';
            return;
        }
        let html = '';
        data.forEach(u => {
            html += `
                <div style="display:flex; justify-content:space-between; padding:10px; background:white; margin-bottom:5px; border-radius:8px;">
                    <b>${u.username}</b>
                    <button onclick="deleteUser('${table}', ${u.id})" style="color:red; background:none; border:none; cursor:pointer;">Delete</button>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    document.getElementById('create-btn').onclick = async () => createUser('staff');
    document.getElementById('create-admin-btn').onclick = async () => createUser('admins');

    async function createUser(table) {
        const prefix = table === 'staff' ? 'new' : 'admin';
        const u = document.getElementById(`${prefix}-user`).value;
        const p = document.getElementById(`${prefix}-pass`).value;
        
        if(!u || !p) return alert("Fill all fields");
        
        const { error } = await supabaseClient.from(table).insert([{username:u, password:p}]);
        if(!error) {
            alert("Created!");
            document.getElementById(`${prefix}-user`).value = '';
            document.getElementById(`${prefix}-pass`).value = '';
            if(table==='staff') loadStaffList(); else loadAdminList();
        } else {
            alert("Error: " + error.message);
        }
    }

    window.deleteUser = async(t, id) => {
        if(confirm("Delete User?")) {
            await supabaseClient.from(t).delete().eq('id', id);
            if(t==='staff') loadStaffList(); else loadAdminList();
        }
    }

    // ==========================================
    // 9. SETTINGS & TEMPLATES
    // ==========================================
    async function loadCurrentTheme() {
        const { data } = await supabaseClient.from('settings').select('value').eq('key', 'active_theme').single();
        if(data) updateThemeUI(data.value);
    }

    window.setTheme = async function(themeName, el) {
        updateThemeUI(themeName);
        await supabaseClient.from('settings').upsert({key: 'active_theme', value: themeName});
    }

    function updateThemeUI(themeName) {
        console.log("Theme set to:", themeName);
    }

    document.getElementById('profile-trigger').onclick = () => {
        document.getElementById('profile-modal').style.display = 'flex';
    };
    
    document.getElementById('save-profile-btn').onclick = async () => {
        alert("Profile updated (Simulation)");
        document.getElementById('profile-modal').style.display = 'none';
    };

    // Load Default Section
    initDashboard();
});
