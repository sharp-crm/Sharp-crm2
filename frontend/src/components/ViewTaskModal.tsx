import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Task } from '../types';

interface ViewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  userName: string;
  getUserName: (userId: string) => string;
}

const ViewTaskModal: React.FC<ViewTaskModalProps> = ({ isOpen, onClose, task, userName, getUserName }) => {
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
                  Task Details
                </Dialog.Title>
                <div className="mt-4">
                  <div className="mb-4">
                    <h4 className="font-semibold">Title</h4>
                    <p>{task.title}</p>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-semibold">Description</h4>
                    <p>{task.description}</p>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-semibold">Status</h4>
                    <p>{task.status}</p>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-semibold">Priority</h4>
                    <p>{task.priority}</p>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-semibold">Type</h4>
                    <p>{task.type}</p>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-semibold">Assignee</h4>
                    <p>{userName}</p>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-semibold">Due Date</h4>
                    <p>{new Date(task.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-semibold">Visible To</h4>
                    <p>
                      {task.visibleTo && task.visibleTo.length > 0
                        ? task.visibleTo.map(userId => getUserName(userId)).join(', ')
                        : 'All users'}
                    </p>
                  </div>

                  {/* Audit Information */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Audit Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-500">Created By</h4>
                        <p className="text-sm text-gray-900">{task.createdBy ? getUserName(task.createdBy) : 'Unknown'}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-gray-500">Created At</h4>
                        <p className="text-sm text-gray-900">{task.createdAt ? new Date(task.createdAt).toLocaleString() : 'Unknown'}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-gray-500">Updated By</h4>
                        <p className="text-sm text-gray-900">{task.updatedBy ? getUserName(task.updatedBy) : 'Not modified'}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-gray-500">Updated At</h4>
                        <p className="text-sm text-gray-900">{task.updatedAt ? new Date(task.updatedAt).toLocaleString() : 'Not modified'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ViewTaskModal; 