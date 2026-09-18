// Describes each stock-movement page; rendered by MovementPage.

export const purchases = {
  title: 'Purchases',
  description: 'Record new equipment bought for a base. Adds to stock.',
  endpoint: '/purchases',
  dateField: 'purchaseDate',
  submitLabel: 'Record purchase',
};

export const transfers = {
  title: 'Transfers',
  description: 'Move equipment from one base to another. Stock is checked at the source base.',
  endpoint: '/transfers',
  dateField: 'transferDate',
  submitLabel: 'Transfer',
  isTransfer: true,
};

export const assignments = {
  title: 'Assignments',
  description: 'Issue equipment to personnel. Removes it from base stock.',
  endpoint: '/assets/assignments',
  dateField: 'assignedDate',
  submitLabel: 'Assign',
  extraFields: [{ name: 'assignedTo', label: 'Assigned to', placeholder: 'e.g. Sgt. Rao', required: true }],
};

export const expenditures = {
  title: 'Expenditures',
  description: 'Record equipment used up, destroyed or lost. Removes it from base stock.',
  endpoint: '/assets/expenditures',
  dateField: 'expendedDate',
  submitLabel: 'Record expenditure',
  extraFields: [{ name: 'reason', label: 'Reason', placeholder: 'e.g. Training exercise' }],
};
