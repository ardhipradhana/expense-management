export const formatCurrency = (amount: number): string => {
    // Format as IDR but replace "IDR" with "Rp" and ensure US locale for separators
    // US locale uses comma for thousands and dot for decimals, which is what the user requested
    // "amount should be in IDR (Rp) but following US style for thousands (comma) and fraction (period)"

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount).replace('IDR', 'Rp');
};
