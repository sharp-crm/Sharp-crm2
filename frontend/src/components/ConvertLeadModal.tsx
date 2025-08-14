import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Lead, contactsApi, dealsApi, leadsApi, productsApi } from '../api/services';
import PhoneNumberInput from './Common/PhoneNumberInput';
import { DEAL_STAGES } from '../types';

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: () => void;
}

const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convertToDeal, setConvertToDeal] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);

  // Deal form data
  const [dealFormData, setDealFormData] = useState({
    dealName: '',
    amount: '',
    phone: '',
    email: '',
    stage: '',
    closeDate: '',
    probability: '',
    description: '',
    visibleTo: [] as string[]
  });

  // Deal stage options
  const dealStageOptions = DEAL_STAGES.map(stage => ({ value: stage, label: stage }));

  // Populate deal form data when lead changes
  useEffect(() => {
    if (lead) {
      // Format phone number with default country code if it doesn't have one
      let formattedPhone = lead.phone || '';
      if (formattedPhone && !formattedPhone.startsWith('+')) {
        formattedPhone = `+91${formattedPhone}`;
      }
      
      setDealFormData({
        dealName: '',
        amount: lead.value ? lead.value.toString() : '',
        phone: formattedPhone,
        email: lead.email || '',
        stage: '',
        closeDate: '',
        probability: '',
        description: '',
        visibleTo: lead.visibleTo || []
      });
    }
  }, [lead]);

  const handleDealFormChange = (field: string, value: string | string[]) => {
    setDealFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConvertToDealChange = (checked: boolean) => {
    setConvertToDeal(checked);
    setShowDealForm(checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lead) return;

    // Validate deal form if converting to deal
    if (convertToDeal) {
      if (!dealFormData.dealName.trim() || !dealFormData.amount.trim() || !dealFormData.stage.trim()) {
        setError('Please fill in all required deal fields');
        return;
      }

      // Validate deal amount is a number
      const dealAmount = parseFloat(dealFormData.amount);
      if (isNaN(dealAmount) || dealAmount <= 0) {
        setError('Please enter a valid deal amount');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Always create contact first
      const contactData = {
        contactOwner: lead.leadOwner || 'Unknown',
        firstName: lead.firstName,
        lastName: lead.lastName || '',
        companyName: lead.company,
        email: lead.email,
        leadSource: lead.leadSource || 'Not specified',
        phone: lead.phone,
        title: lead.title,
        description: lead.description,
        street: lead.street,
        area: lead.area,
        city: lead.city,
        state: lead.state,
        country: lead.country,
        zipCode: lead.zipCode,
        visibleTo: lead.visibleTo || [],
        // Preserve product associations from the lead
        relatedProductIds: lead.relatedProductIds || []
      };

      const contact = await contactsApi.create(contactData);

      // Update all products that were associated with this lead
      if (lead.relatedProductIds && lead.relatedProductIds.length > 0) {
        console.log('🔄 Updating products after lead conversion:', lead.relatedProductIds);
        
        for (const productId of lead.relatedProductIds) {
          try {
            // Get the current product
            const product = await productsApi.getById(productId);
            if (product) {
              // Remove the lead from relatedLeadIds
              const currentLeadIds = product.relatedLeadIds || [];
              const updatedLeadIds = currentLeadIds.filter(id => id !== lead.id);
              
              // Add the new contact to relatedContactIds
              const currentContactIds = product.relatedContactIds || [];
              const updatedContactIds = [...currentContactIds, contact.id];
              
              // Update the product
              await productsApi.update(productId, {
                relatedLeadIds: updatedLeadIds,
                relatedContactIds: updatedContactIds
              });
              
              console.log(`✅ Product ${productId} updated: removed lead ${lead.id}, added contact ${contact.id}`);
            }
          } catch (error) {
            console.error(`❌ Failed to update product ${productId}:`, error);
          }
        }
      }

      // Create deal if checkbox is checked
      if (convertToDeal) {
        const dealAmount = parseFloat(dealFormData.amount);
        await dealsApi.create({
          dealOwner: lead.leadOwner || 'Unknown',
          dealName: dealFormData.dealName,
          amount: dealAmount,
          phone: dealFormData.phone,
          email: dealFormData.email,
          leadSource: lead.leadSource || 'Not specified',
          stage: dealFormData.stage,
          closeDate: dealFormData.closeDate,
          probability: dealFormData.probability ? parseFloat(dealFormData.probability) : 0,
          description: dealFormData.description,
          visibleTo: dealFormData.visibleTo,
          relatedContactIds: [contact.id] // Associate the newly created contact with the deal
        });
      }

      // Soft delete the lead after successful conversion
      await leadsApi.delete(lead.id);

      onSuccess();
      onClose();
      
      // Redirect to leads page
      navigate('/leads');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert lead');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setLoading(false);
    setConvertToDeal(false);
    setShowDealForm(false);
    onClose();
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full max-h-[95vh] rounded-xl bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-8 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Icons.UserCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Dialog.Title className="text-2xl font-bold text-gray-900">
                  Convert Lead
                </Dialog.Title>
                <p className="text-sm text-gray-500 mt-1">
                  Convert this lead to a contact and optionally create a deal
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
            >
              <Icons.X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <Icons.AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Lead Info Summary */}
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center mb-4">
                <Icons.User className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Lead Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Name:</span>
                    <span className="text-gray-900 font-semibold">{lead.firstName} {lead.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Company:</span>
                    <span className="text-gray-900">{lead.company}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Email:</span>
                    <span className="text-gray-900">{lead.email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Phone:</span>
                    <span className="text-gray-900">{lead.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Value:</span>
                    <span className="text-gray-900 font-semibold">${(lead.value || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Status:</span>
                    <span className="text-gray-900">{lead.leadStatus}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Conversion Section */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <Icons.UserCheck className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Contact Conversion</h3>
              </div>
              <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <Icons.CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-800 font-medium mb-2">
                      This lead will be automatically converted to a business contact
                    </p>
                    <p className="text-sm text-green-700">
                      All lead information including contact details, company information, and notes will be preserved in the new contact record.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Deal Conversion Option */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <Icons.Target className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Deal Conversion (Optional)</h3>
              </div>
              
              <div className="p-6 bg-purple-50 border border-purple-200 rounded-xl mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    id="convertToDeal"
                    checked={convertToDeal}
                    onChange={(e) => handleConvertToDealChange(e.target.checked)}
                    className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="convertToDeal" className="text-lg font-medium text-gray-900">
                    Create a deal from this lead
                  </label>
                </div>
                <p className="text-sm text-purple-700 ml-8">
                  Optionally create a new deal with the lead information. This will help you track the sales process.
                </p>
              </div>
              
              {showDealForm && (
                <div className="p-8 bg-white border-2 border-purple-200 rounded-xl shadow-sm">
                  <div className="flex items-center mb-6">
                    <Icons.FileText className="w-5 h-5 text-purple-600 mr-3" />
                    <h4 className="text-lg font-semibold text-gray-900">Deal Information</h4>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Basic Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Deal Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={dealFormData.dealName}
                            onChange={(e) => handleDealFormChange('dealName', e.target.value)}
                            className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                              dealFormData.dealName ? 'border-gray-300' : 'border-red-300 bg-red-50'
                            }`}
                            placeholder="Enter deal name"
                            required
                          />
                          {!dealFormData.dealName && (
                            <p className="mt-1 text-sm text-red-600">Please enter a deal name</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Deal Amount <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={dealFormData.amount}
                            onChange={(e) => handleDealFormChange('amount', e.target.value)}
                            placeholder="Enter deal amount"
                            min="0"
                            step="0.01"
                            className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                              dealFormData.amount ? 'border-gray-300' : 'border-red-300 bg-red-50'
                            }`}
                            required
                          />
                          {!dealFormData.amount && (
                            <p className="mt-1 text-sm text-red-600">Please enter a deal amount</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Contact Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Phone
                          </label>
                          <PhoneNumberInput
                            value={dealFormData.phone}
                            onChange={(phoneNumber) => handleDealFormChange('phone', phoneNumber)}
                            placeholder="Enter phone number"
                            className="w-full"
                            defaultCountryCode="+91"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Email
                          </label>
                          <input
                            type="email"
                            value={dealFormData.email}
                            onChange={(e) => handleDealFormChange('email', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                            placeholder="Enter email address"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Deal Details */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Deal Details</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lead Source
                          </label>
                          <input
                            type="text"
                            value={lead.leadSource || 'Not specified'}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm bg-gray-50 text-gray-700 cursor-not-allowed"
                            readOnly
                            disabled
                          />
                          <p className="mt-1 text-sm text-gray-500">
                            Lead source is preserved from the original lead
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Deal Stage <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={dealFormData.stage}
                            onChange={(e) => handleDealFormChange('stage', e.target.value)}
                            className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                              dealFormData.stage ? 'border-gray-300' : 'border-red-300 bg-red-50'
                            }`}
                            required
                          >
                            <option value="">Select Stage</option>
                            {dealStageOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {!dealFormData.stage && (
                            <p className="mt-1 text-sm text-red-600">Please select a deal stage</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expected Close Date
                          </label>
                          <input
                            type="date"
                            value={dealFormData.closeDate}
                            onChange={(e) => handleDealFormChange('closeDate', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Probability (%)
                          </label>
                          <input
                            type="number"
                            value={dealFormData.probability}
                            onChange={(e) => handleDealFormChange('probability', e.target.value)}
                            placeholder="Enter probability percentage"
                            min="0"
                            max="100"
                            step="1"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={dealFormData.description}
                        onChange={(e) => handleDealFormChange('description', e.target.value)}
                        rows={4}
                        placeholder="Enter deal description (optional)"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Warning Message */}
            <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <Icons.AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-800 font-medium mb-1">
                    Important Notice
                  </p>
                  <p className="text-sm text-amber-700">
                    After successful conversion, this lead will be permanently removed from the leads list. 
                    The contact and deal (if created) will be available in their respective sections.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Icons.UserCheck className="w-4 h-4 mr-2" />
                    Convert & Delete Lead
                  </>
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ConvertLeadModal; 