import { create } from 'zustand';
import { Deal, Task, Lead, Contact } from '../types';
import { Dealer, Subsidiary } from '../api/services';

interface CRMStore {
  deals: Deal[];
  tasks: Task[];
  leads: Lead[];
  contacts: Contact[];
  dealers: Dealer[];
  subsidiaries: Subsidiary[];
  addDeal: (deal: Deal) => void;
  addTask: (task: Task) => void;
  addLead: (lead: Lead) => void;
  addContact: (contact: Contact) => void;
  addDealer: (dealer: Dealer) => void;
  addSubsidiary: (subsidiary: Subsidiary) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
}

export const useCRMStore = create<CRMStore>((set) => ({
  deals: [],
  tasks: [],
  leads: [],
  contacts: [],
  dealers: [],
  subsidiaries: [],
  addDeal: (deal) => set((state) => ({ deals: [...state.deals, deal] })),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  addLead: (lead) => set((state) => ({ leads: [...state.leads, lead] })),
  addContact: (contact) => set((state) => ({ contacts: [...state.contacts, contact] })),
  addDealer: (dealer) => set((state) => ({ dealers: [...state.dealers, dealer] })),
  addSubsidiary: (subsidiary) => set((state) => ({ subsidiaries: [...state.subsidiaries, subsidiary] })),
  updateDeal: (id, updates) => set((state) => ({
    deals: state.deals.map(deal => deal.id === id ? { ...deal, ...updates } : deal)
  })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(task => task.id === id ? { ...task, ...updates } : task)
  }))
}));