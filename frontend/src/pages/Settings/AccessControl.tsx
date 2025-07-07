import React, { useState } from 'react';
import PageHeader from '../../components/Common/PageHeader';
import AddNewUserModal from '../../components/AddNewUserModal';
import AllUsers from '../AllUsersByDomain'; // ✅ Reused AllUsers component
import { useAuthStore } from '../../store/useAuthStore';

const AccessControl: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const currentUser = useAuthStore((s) => s.user);

  return (
    <div className="p-6">
      <PageHeader
        title="Access Control"
        subtitle="Manage user roles and permissions"
        breadcrumbs={[{ name: 'Home', path: '/' },
          { name: 'Settings' }, { name: 'Access Control' }]}
      />

      {/* Add New Employee button (Admins only) */}
      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin') && (
        <div className="mt-4 mb-6">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {/* Add New Employee/Client button (Admins only) */}
            + {currentUser?.role === 'SuperAdmin' || currentUser?.role === 'SUPER_ADMIN' ? 'Add New Client' : 'Add New Employee'}
          </button>
        </div>
      )}

      {/* ✅ Reuse AllUsers component to display grouped user list */}
      <AllUsers hideHeader hideBreadcrumbs />

      {/* Modal for adding new user */}
      <AddNewUserModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onUserAdded={() => window.location.reload()} // Refresh to reflect added user
      />
    </div>
  );
};

export default AccessControl;
