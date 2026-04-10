import React from 'react';
import { formatDate, getStatusLabel, getStatusColor } from '../utils/formatters';
import StatusBadge from './StatusBadge';

export default function ApprovalWorkflow({ payroll, onApprove, onReject, onMarkPaid }) {
  const getTimelineSteps = () => [
    {
      step: 1,
      label: 'Draft',
      status: 'draft',
      description: 'Payroll is created',
      icon: '📝'
    },
    {
      step: 2,
      label: 'Submitted',
      status: 'pending',
      description: 'Waiting for manager approval',
      icon: '⏳'
    },
    {
      step: 3,
      label: 'Approved',
      status: 'approved',
      description: 'Approved by manager',
      icon: '✅'
    },
    {
      step: 4,
      label: 'Paid',
      status: 'paid',
      description: 'Payment completed',
      icon: '💰'
    }
  ];

  const getStatusIndex = () => {
    const steps = getTimelineSteps();
    return steps.findIndex(s => s.status === payroll?.status) + 1;
  };

  const statusIndex = getStatusIndex();
  const steps = getTimelineSteps();

  const getApproverRole = (status) => {
    switch (status) {
      case 'pending':
        return 'Manager / Department Head';
      case 'approved':
        return 'Chief Accountant';
      default:
        return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">🔄 Payroll Approval Workflow</h2>

      {/* Timeline */}
      <div className="mb-12">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-gray-200"></div>
          <div
            className="absolute left-8 top-0 w-1 bg-blue-600 transition-all"
            style={{ height: `${(statusIndex / steps.length) * 100}%` }}
          ></div>

          {/* Timeline Steps */}
          <div className="space-y-8">
            {steps.map((timelineStep) => {
              const isCompleted = statusIndex > timelineStep.step;
              const isCurrent = timelineStep.status === payroll?.status;

              return (
                <div key={timelineStep.step} className="relative pl-24">
                  {/* Step Circle */}
                  <div
                    className={`absolute left-0 w-16 h-16 rounded-full flex items-center justify-center text-3xl border-4 transition-all ${
                      isCompleted
                        ? 'bg-green-100 border-green-600'
                        : isCurrent
                        ? 'bg-blue-100 border-blue-600 ring-4 ring-blue-300'
                        : 'bg-gray-100 border-gray-300'
                    }`}
                  >
                    {timelineStep.icon}
                  </div>

                  {/* Step Content */}
                  <div className={`rounded-lg p-6 ${
                    isCurrent ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50 border border-gray-300'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className={`text-lg font-semibold ${
                          isCompleted ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                          {timelineStep.label}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{timelineStep.description}</p>
                      </div>
                      {isCompleted && <span className="text-2xl">✅</span>}
                      {isCurrent && <span className="text-2xl">⏳</span>}
                    </div>

                    {/* Status Badge */}
                    <div className="mt-3">
                      <StatusBadge status={timelineStep.status} size="sm" />
                    </div>

                    {/* Approver Info */}
                    {isCurrent && getApproverRole(payroll?.status) && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm font-medium text-yellow-900">
                          👤 Approval required from: {getApproverRole(payroll?.status)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Available Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          {payroll?.status === 'pending' && (
            <>
              <button
                onClick={() => onApprove?.()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                ✅ Approve Payroll
              </button>
              <button
                onClick={() => onReject?.()}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
              >
                ❌ Reject
              </button>
            </>
          )}

          {payroll?.status === 'approved' && (
            <button
              onClick={() => onMarkPaid?.()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition col-span-2"
            >
              💰 Confirm Payment
            </button>
          )}

          {(payroll?.status === 'draft' || payroll?.status === 'paid') && (
            <div className="col-span-2 text-center py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                {payroll?.status === 'draft'
                  ? '📝 Payroll is in draft status. HR needs to submit it for approval.'
                  : '💰 Payroll has been paid. Process completed!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Comments/Notes Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💬 Notes & Comments</h3>
        
        {payroll?.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-red-900">Rejection reason:</p>
            <p className="text-sm text-red-700 mt-1">{payroll.rejectionReason}</p>
          </div>
        )}

        <textarea
          placeholder="Add notes for this payroll..."
          className="w-full px-4 py-2 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="4"
        />
      </div>

      {/* Status History */}
      {payroll?.statusHistory && payroll.statusHistory.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Status History</h3>
          <div className="space-y-3">
            {payroll.statusHistory.map((history, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-md border">
                <div>
                  <p className="font-medium text-gray-900">
                    {history.action} → <span className="text-blue-600">{getStatusLabel(history.newStatus)}</span>
                  </p>
                  <p className="text-sm text-gray-600">By: {history.userName}</p>
                </div>
                <span className="text-sm text-gray-500">{formatDate(history.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
