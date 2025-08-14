import { 
  leadsApi, 
  contactsApi, 
  dealsApi, 
  tasksApi, 
  subsidiariesApi, 
  dealersApi,
  productsApi,
  quotesApi,
  Lead,
  Contact,
  Deal,
  Task,
  Subsidiary,
  Dealer,
  Product,
  Quote
} from '../api/services';

export interface SearchResult {
  id: string;
  type: 'lead' | 'contact' | 'deal' | 'task' | 'subsidiary' | 'dealer' | 'product' | 'quote';
  title: string;
  subtitle: string;
  description: string;
  route: string;
  data: any;
}

export interface SearchResults {
  leads: SearchResult[];
  contacts: SearchResult[];
  deals: SearchResult[];
  tasks: SearchResult[];
  subsidiaries: SearchResult[];
  dealers: SearchResult[];
  products: SearchResult[];
  quotes: SearchResult[];
  total: number;
}

class GlobalSearchService {
  private searchTermMinLength = 2;
  private maxResultsPerType = 5;

  private normalizeSearchTerm(term: string): string {
    return term.toLowerCase().trim();
  }

  private searchInText(searchTerm: string, ...texts: (string | undefined | null)[]): boolean {
    const normalizedTerm = this.normalizeSearchTerm(searchTerm);
    return texts.some(text => 
      text && this.normalizeSearchTerm(text).includes(normalizedTerm)
    );
  }

  private searchLeads(leads: Lead[], searchTerm: string): SearchResult[] {
    return leads
      .filter(lead => 
        this.searchInText(
          searchTerm,
          lead.firstName,
          lead.lastName,
          lead.email,
          lead.phone,
          lead.company,
          lead.title,
          lead.leadSource,
          lead.leadStatus,
          lead.description,
          lead.city,
          lead.state,
          lead.street,
          lead.area,
          lead.country,
          lead.zipCode,
          lead.value?.toString()
        )
      )
      .slice(0, this.maxResultsPerType)
      .map(lead => ({
        id: lead.id,
        type: 'lead' as const,
        title: [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unnamed Lead',
        subtitle: lead.company || lead.email,
        description: `${lead.leadStatus} • ${lead.leadSource}`,
        route: `/leads/${lead.id}`,
        data: lead
      }));
  }

  private searchContacts(contacts: Contact[], searchTerm: string): SearchResult[] {
    return contacts
      .filter(contact =>
        this.searchInText(
          searchTerm,
          contact.firstName,
          contact.lastName,
          contact.email,
          contact.phone,
          contact.companyName,
          contact.title,
          contact.department,
          contact.leadSource,
          contact.description,
          contact.city,
          contact.state,
          contact.street,
          contact.area,
          contact.country,
          contact.zipCode,
          contact.notes,
          contact.status
        )
      )
      .slice(0, this.maxResultsPerType)
      .map(contact => ({
        id: contact.id,
        type: 'contact' as const,
        title: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unnamed Contact',
        subtitle: contact.companyName || contact.phone || contact.email,
        description: `${contact.title || 'Contact'} • ${contact.leadSource}`,
        route: `/contacts/${contact.id}`,
        data: contact
      }));
  }

  private searchDeals(deals: Deal[], searchTerm: string): SearchResult[] {
    return deals
      .filter(deal =>
        this.searchInText(
          searchTerm,
          deal.dealName,
          deal.dealOwner,
          deal.leadSource,
          deal.stage,
          deal.description,
          deal.amount?.toString()
        )
      )
      .slice(0, this.maxResultsPerType)
      .map(deal => ({
        id: deal.id,
        type: 'deal' as const,
        title: deal.dealName || deal.name || 'Untitled Deal',
        subtitle: `$${deal.amount?.toLocaleString() || '0'}`,
        description: `${deal.stage} • ${deal.dealOwner || deal.owner}`,
        route: `/deals/${deal.id}`,
        data: deal
      }));
  }

  private searchTasks(tasks: Task[], searchTerm: string): SearchResult[] {
    return tasks
      .filter(task =>
        this.searchInText(
          searchTerm,
          task.title,
          task.description,
          task.assignee,
          task.priority,
          task.status,
          task.type
        )
      )
      .slice(0, this.maxResultsPerType)
      .map(task => ({
        id: task.id,
        type: 'task' as const,
        title: task.title,
        subtitle: task.assignee,
        description: `${task.status} • ${task.priority} Priority • ${task.type}`,
        route: `/tasks/${task.id}`,
        data: task
      }));
  }

  private searchSubsidiaries(subsidiaries: Subsidiary[], searchTerm: string): SearchResult[] {
    return subsidiaries
      .filter(subsidiary =>
        this.searchInText(
          searchTerm,
          subsidiary.name,
          subsidiary.email,
          subsidiary.contact,
          subsidiary.address,
          subsidiary.totalEmployees?.toString()
        )
      )
      .slice(0, this.maxResultsPerType)
      .map(subsidiary => ({
        id: subsidiary.id,
        type: 'subsidiary' as const,
        title: subsidiary.name,
        subtitle: subsidiary.email,
        description: `${subsidiary.totalEmployees} employees • ${subsidiary.address}`,
        route: `/subsidiaries/${subsidiary.id}`,
        data: subsidiary
      }));
  }

  private searchDealers(dealers: Dealer[], searchTerm: string): SearchResult[] {
    return dealers
      .filter(dealer =>
        this.searchInText(
          searchTerm,
          dealer.name,
          dealer.email,
          dealer.phone,
          dealer.company,
          dealer.status,
          dealer.territory,
          dealer.location
        )
      )
      .slice(0, this.maxResultsPerType)
      .map(dealer => ({
        id: dealer.id,
        type: 'dealer' as const,
        title: dealer.name,
        subtitle: dealer.company,
        description: `${dealer.status} • ${dealer.territory} • ${dealer.location}`,
        route: `/dealers/${dealer.id}`,
        data: dealer
      }));
  }

  private searchProducts(products: Product[], searchTerm: string): SearchResult[] {
    return products
      .filter(product =>
        this.searchInText(
          searchTerm,
          product.name,
          product.description,
          product.category,
          product.price?.toString(),
          product.cost?.toString()
        )
      )
      .slice(0, this.maxResultsPerType)
      .map(product => ({
        id: product.id,
        type: 'product' as const,
        title: product.name || 'Untitled Product',
        subtitle: product.category || 'No Category',
        description: `${product.category || 'No Category'} • $${product.price?.toLocaleString() || '0'}`,
        route: `/products/${product.id}`,
        data: product
      }));
  }

  private searchQuotes(quotes: Quote[], searchTerm: string): SearchResult[] {
    return quotes
      .filter(quote =>
        this.searchInText(
          searchTerm,
          quote.quoteNumber,
          quote.quoteName,
          quote.description,
          quote.status,
          quote.totalAmount?.toString(),
          quote.quoteOwner
        )
      )
      .slice(0, this.maxResultsPerType)
      .map(quote => ({
        id: quote.id,
        type: 'quote' as const,
        title: quote.quoteName || quote.quoteNumber || 'Untitled Quote',
        subtitle: quote.quoteOwner || quote.quoteNumber,
        description: `${quote.status} • $${quote.totalAmount?.toLocaleString() || '0'}`,
        route: `/quotes/${quote.id}`,
        data: quote
      }));
  }

  async search(searchTerm: string): Promise<SearchResults> {
    if (searchTerm.length < this.searchTermMinLength) {
      return {
        leads: [],
        contacts: [],
        deals: [],
        tasks: [],
        subsidiaries: [],
        dealers: [],
        products: [],
        quotes: [],
        total: 0
      };
    }

    try {
      // Fetch data from all APIs in parallel
      const [leads, contacts, deals, tasks, subsidiaries, dealers, products, quotes] = await Promise.all([
        leadsApi.getAll(),
        contactsApi.getAll(),
        dealsApi.getAll(),
        tasksApi.getAll(),
        subsidiariesApi.getAll(),
        dealersApi.getAll(),
        productsApi.getAll(),
        quotesApi.getAll()
      ]);

      // Search in each data type
      const leadResults = this.searchLeads(leads, searchTerm);
      const contactResults = this.searchContacts(contacts, searchTerm);
      const dealResults = this.searchDeals(deals, searchTerm);
      const taskResults = this.searchTasks(tasks, searchTerm);
      const subsidiaryResults = this.searchSubsidiaries(subsidiaries, searchTerm);
      const dealerResults = this.searchDealers(dealers, searchTerm);
      const productResults = this.searchProducts(products, searchTerm);
      const quoteResults = this.searchQuotes(quotes, searchTerm);

      const total = leadResults.length + contactResults.length + dealResults.length + 
                   taskResults.length + subsidiaryResults.length + dealerResults.length +
                   productResults.length + quoteResults.length;

      return {
        leads: leadResults,
        contacts: contactResults,
        deals: dealResults,
        tasks: taskResults,
        subsidiaries: subsidiaryResults,
        dealers: dealerResults,
        products: productResults,
        quotes: quoteResults,
        total
      };
    } catch (error) {
      console.error('Global search error:', error);
      return {
        leads: [],
        contacts: [],
        deals: [],
        tasks: [],
        subsidiaries: [],
        dealers: [],
        products: [],
        quotes: [],
        total: 0
      };
    }
  }

  // Get quick search results (fewer results, faster response)
  async quickSearch(searchTerm: string, maxResults = 8): Promise<SearchResult[]> {
    const results = await this.search(searchTerm);
    
    // Combine all results and sort by relevance (you can implement more sophisticated scoring)
    const allResults = [
      ...results.leads,
      ...results.contacts,
      ...results.deals,
      ...results.tasks,
      ...results.subsidiaries,
      ...results.dealers,
      ...results.products,
      ...results.quotes
    ];

    return allResults.slice(0, maxResults);
  }
}

export const globalSearchService = new GlobalSearchService(); 