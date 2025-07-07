import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Task } from '../types';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onSave: (updatedTask: Task) => void;
  userName: string;
  users: { id: string; name: string }[];
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, task, onSave, userName, users }) => {
  const [editedTask, setEditedTask] = useState<Task>(() => {
    // If task has no visibleTo array or it's empty, make it visible to all users
    const defaultVisibleTo = (!task.visibleTo || task.visibleTo.length === 0) 
      ? users.map(user => user.id)
      : task.visibleTo;
    
    return {
      ...task,
      visibleTo: defaultVisibleTo
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedTask);
    onClose();
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Edit Task
                </Dialog.Title>
                <form onSubmit={handleSubmit}>
                  <div className="mt-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        type="text"
                        value={editedTask.title}
                        onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        value={editedTask.description}
                        onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        rows={3}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={editedTask.status}
                        onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value as Task['status'] })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Follow Up">Follow Up</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <select
                        value={editedTask.priority}
                        onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as Task['priority'] })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={editedTask.type}
                        onChange={(e) => setEditedTask({ ...editedTask, type: e.target.value as Task['type'] })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="Follow-up">Follow-up</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Call">Call</option>
                        <option value="Email">Email</option>
                        <option value="Demo">Demo</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Assignee</label>
                      <input
                        type="text"
                        value={userName}
                        disabled
                        className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Due Date</label>
                      <input
                        type="date"
                        value={new Date(editedTask.dueDate).toISOString().split('T')[0]}
                        onChange={(e) => setEditedTask({ ...editedTask, dueDate: new Date(e.target.value).toISOString() })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Visible To</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                        {users.map(user => (
                          <label key={user.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              value={user.id}
                              checked={editedTask.visibleTo?.includes(user.id) || false}
                              onChange={(e) => {
                                const userId = e.target.value;
                                const newVisibleTo = e.target.checked
                                  ? [...(editedTask.visibleTo || []), userId]
                                  : (editedTask.visibleTo || []).filter(id => id !== userId);
                                setEditedTask({ ...editedTask, visibleTo: newVisibleTo });
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{user.name}</span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">By default, all users are selected (task visible to everyone). Uncheck users to restrict visibility.</p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default EditTaskModal; 