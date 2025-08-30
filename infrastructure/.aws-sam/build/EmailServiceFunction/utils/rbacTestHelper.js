"use strict";
/**
 * RBAC Test Helper
 * This utility demonstrates how the Role-Based Access Control (RBAC) system works for Leads
 * and helps test different scenarios with various user roles.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACTestHelper = void 0;
exports.runRBACDemo = runRBACDemo;
const leadsRBAC_1 = require("../services/leadsRBAC");
class RBACTestHelper {
    /**
     * Test scenarios for different user roles
     */
    static getTestScenarios() {
        return [
            {
                name: "ADMIN_ACCESS_ALL",
                description: "Admin should see all leads in their tenant",
                user: {
                    userId: "admin-001",
                    email: "admin@company.com",
                    role: "ADMIN",
                    tenantId: "tenant-001"
                },
                expectedBehavior: "Should return ALL leads in tenant-001, regardless of leadOwner"
            },
            {
                name: "SALES_MANAGER_ACCESS_TEAM",
                description: "Sales Manager should see their own leads + subordinates' leads",
                user: {
                    userId: "manager-001",
                    email: "manager@company.com",
                    role: "SALES_MANAGER",
                    tenantId: "tenant-001"
                },
                expectedBehavior: "Should return leads where leadOwner = manager-001 OR leadOwner IN (subordinates of manager-001)"
            },
            {
                name: "SALES_REP_ACCESS_OWN",
                description: "Sales Rep should only see leads they own",
                user: {
                    userId: "rep-001",
                    email: "rep1@company.com",
                    role: "SALES_REP",
                    tenantId: "tenant-001",
                    reportingTo: "manager-001"
                },
                expectedBehavior: "Should return ONLY leads where leadOwner = rep-001"
            },
            {
                name: "TENANT_ISOLATION",
                description: "Users should never see data from other tenants",
                user: {
                    userId: "admin-002",
                    email: "admin@othertenant.com",
                    role: "ADMIN",
                    tenantId: "tenant-002"
                },
                expectedBehavior: "Should return ONLY leads from tenant-002, even though user is ADMIN"
            }
        ];
    }
    /**
     * Test data creation helper
     */
    static getSampleLeads() {
        return [
            {
                id: "lead-001",
                firstName: "John",
                lastName: "Doe",
                company: "Company A",
                email: "john@companya.com",
                leadOwner: "admin-001",
                leadSource: "Website",
                leadStatus: "New",
                tenantId: "tenant-001",
                createdBy: "admin-001",
                isDeleted: false
            },
            {
                id: "lead-002",
                firstName: "Jane",
                lastName: "Smith",
                company: "Company B",
                email: "jane@companyb.com",
                leadOwner: "manager-001",
                leadSource: "Referral",
                leadStatus: "Qualified",
                tenantId: "tenant-001",
                createdBy: "manager-001",
                isDeleted: false
            },
            {
                id: "lead-003",
                firstName: "Bob",
                lastName: "Johnson",
                company: "Company C",
                email: "bob@companyc.com",
                leadOwner: "rep-001",
                leadSource: "Cold Call",
                leadStatus: "New",
                tenantId: "tenant-001",
                createdBy: "rep-001",
                isDeleted: false
            },
            {
                id: "lead-004",
                firstName: "Alice",
                lastName: "Brown",
                company: "Company D",
                email: "alice@companyd.com",
                leadOwner: "rep-002",
                leadSource: "Trade Show",
                leadStatus: "Contacted",
                tenantId: "tenant-001",
                createdBy: "rep-002",
                isDeleted: false
            },
            {
                id: "lead-005",
                firstName: "Charlie",
                lastName: "Wilson",
                company: "Other Tenant Company",
                email: "charlie@othertenant.com",
                leadOwner: "admin-002",
                leadSource: "Website",
                leadStatus: "New",
                tenantId: "tenant-002", // Different tenant!
                createdBy: "admin-002",
                isDeleted: false
            }
        ];
    }
    /**
     * Run RBAC test scenarios and log results
     */
    static async runTestScenarios() {
        console.log("🧪 =================================");
        console.log("🧪 RBAC Test Suite for Leads Module");
        console.log("🧪 =================================");
        const scenarios = this.getTestScenarios();
        for (const scenario of scenarios) {
            console.log(`\n🔍 Testing: ${scenario.name}`);
            console.log(`📝 Description: ${scenario.description}`);
            console.log(`👤 User: ${scenario.user.email} (${scenario.user.role})`);
            console.log(`🏢 Tenant: ${scenario.user.tenantId}`);
            console.log(`📋 Expected: ${scenario.expectedBehavior}`);
            try {
                // Test getAllLeads equivalent
                const leads = await leadsRBAC_1.leadsRBACService.getLeadsForUser(scenario.user);
                console.log(`✅ Result: Retrieved ${leads.length} leads`);
                // Log lead details for verification
                if (leads.length > 0) {
                    console.log(`📊 Lead Details:`);
                    leads.forEach(lead => {
                        console.log(`   - ${lead.firstName} ${lead.lastName} (Owner: ${lead.leadOwner}, Tenant: ${lead.tenantId})`);
                    });
                }
                // Test getLeadById for first lead if available
                if (leads.length > 0) {
                    const firstLead = leads[0];
                    const leadById = await leadsRBAC_1.leadsRBACService.getLeadByIdForUser(firstLead.id, scenario.user);
                    console.log(`🔍 getLeadById test: ${leadById ? 'SUCCESS' : 'FAILED'} for lead ${firstLead.id}`);
                }
            }
            catch (error) {
                console.error(`❌ Test failed for ${scenario.name}:`, error);
            }
            console.log(`${"=".repeat(60)}`);
        }
    }
    /**
     * Test specific scenarios that demonstrate RBAC features
     */
    static async testSpecificScenarios() {
        console.log("\n🎯 =================================");
        console.log("🎯 Specific RBAC Scenario Tests");
        console.log("🎯 =================================");
        // Scenario 1: Sales Rep tries to access another rep's lead
        console.log("\n🔒 Scenario 1: Sales Rep accessing other rep's lead");
        const rep1 = {
            userId: "rep-001",
            email: "rep1@company.com",
            role: "SALES_REP",
            tenantId: "tenant-001",
            reportingTo: "manager-001"
        };
        // Try to access lead owned by rep-002
        try {
            const inaccessibleLead = await leadsRBAC_1.leadsRBACService.getLeadByIdForUser("lead-004", rep1);
            console.log(`   Result: ${inaccessibleLead ? 'FAILED - Should not have access!' : 'SUCCESS - Access denied as expected'}`);
        }
        catch (error) {
            console.log(`   Result: SUCCESS - Access properly denied`);
        }
        // Scenario 2: Manager accessing subordinate's lead  
        console.log("\n👥 Scenario 2: Manager accessing subordinate's lead");
        const manager = {
            userId: "manager-001",
            email: "manager@company.com",
            role: "SALES_MANAGER",
            tenantId: "tenant-001"
        };
        try {
            // Should be able to access rep-001's lead since rep-001 reports to manager-001
            const subordinateLead = await leadsRBAC_1.leadsRBACService.getLeadByIdForUser("lead-003", manager);
            console.log(`   Result: ${subordinateLead ? 'SUCCESS - Manager can access subordinate lead' : 'FAILED - Manager should have access'}`);
        }
        catch (error) {
            console.log(`   Result: FAILED - Manager should have access to subordinate leads`);
        }
        // Scenario 3: Cross-tenant access attempt
        console.log("\n🏢 Scenario 3: Cross-tenant access prevention");
        const tenant2Admin = {
            userId: "admin-002",
            email: "admin@othertenant.com",
            role: "ADMIN",
            tenantId: "tenant-002"
        };
        try {
            // Admin from tenant-002 trying to access tenant-001 lead
            const crossTenantLead = await leadsRBAC_1.leadsRBACService.getLeadByIdForUser("lead-001", tenant2Admin);
            console.log(`   Result: ${crossTenantLead ? 'FAILED - Cross-tenant access should be blocked!' : 'SUCCESS - Cross-tenant access blocked'}`);
        }
        catch (error) {
            console.log(`   Result: SUCCESS - Cross-tenant access properly blocked`);
        }
    }
    /**
     * Display RBAC rules summary
     */
    static displayRBACRules() {
        console.log("\n📜 =================================");
        console.log("📜 RBAC Rules for Leads Module");
        console.log("📜 =================================");
        console.log("\n🔐 Access Control Rules:");
        console.log("1. 🏢 TENANT ISOLATION (Always Applied First):");
        console.log("   - Users can ONLY see data from their own tenant");
        console.log("   - Cross-tenant access is NEVER allowed, regardless of role");
        console.log("\n2. 👑 ADMIN Role:");
        console.log("   - Can view ALL leads within their tenant");
        console.log("   - Full access to all CRUD operations");
        console.log("   - No ownership restrictions");
        console.log("\n3. 👥 SALES_MANAGER Role:");
        console.log("   - Can view leads they OWN (leadOwner = their userId)");
        console.log("   - Can view leads owned by their SUBORDINATES (users with reportingTo = manager's userId)");
        console.log("   - Cannot view leads from other managers or their teams");
        console.log("\n4. 👤 SALES_REP Role:");
        console.log("   - Can ONLY view leads they OWN (leadOwner = their userId)");
        console.log("   - Cannot view leads from other reps or managers");
        console.log("   - Most restrictive access level");
        console.log("\n🔄 Data Fetching Process:");
        console.log("1. Apply tenant filter (tenantId = user.tenantId)");
        console.log("2. Apply soft-delete filter (isDeleted = false)");
        console.log("3. Apply role-based ownership filter:");
        console.log("   - ADMIN: No additional filter");
        console.log("   - SALES_MANAGER: leadOwner IN (userId, subordinate1, subordinate2, ...)");
        console.log("   - SALES_REP: leadOwner = userId");
        console.log("\n🛡️ Security Features:");
        console.log("- ✅ Prevents data leaks between tenants");
        console.log("- ✅ Enforces hierarchical access control");
        console.log("- ✅ Uses leadOwner field for ownership-based filtering");
        console.log("- ✅ Leverages reportingTo field for manager-subordinate relationships");
        console.log("- ✅ All queries include proper logging for audit trails");
    }
}
exports.RBACTestHelper = RBACTestHelper;
// RBACTestHelper is already exported via the class declaration above
// Demo function to run all tests
async function runRBACDemo() {
    console.log("🚀 Starting RBAC Demo for Leads Module...\n");
    RBACTestHelper.displayRBACRules();
    await RBACTestHelper.runTestScenarios();
    await RBACTestHelper.testSpecificScenarios();
    console.log("\n✅ RBAC Demo completed!");
    console.log("💡 This demonstrates how the RBAC system ensures:");
    console.log("   - Tenant-based data segregation");
    console.log("   - Role hierarchy enforcement (ADMIN > SALES_MANAGER > SALES_REP)");
    console.log("   - LeadOwner-based access control");
    console.log("   - Manager-subordinate relationship respect");
}
