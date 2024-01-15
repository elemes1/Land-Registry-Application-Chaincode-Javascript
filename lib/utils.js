// eslint-disable-next-line strict
function validateLandInput({ landId, longitude, latitude, owner, address, price, tenureType, restrictiveCovenants, easements, mortgageDetails }) {
    if (!landId || typeof landId !== 'string') {
        throw new Error('Invalid land ID');
    }
    if (!longitude || !latitude || isNaN(longitude) || isNaN(latitude)) {
        throw new Error('Invalid coordinates');
    }

    if (!owner || typeof owner !== 'string') {
        throw new Error('Invalid owner');
    }
    if (!address || typeof address !== 'string') {
        throw new Error('Invalid address');
    }
    // if (typeof price !== 'number' || isNaN(price) || price < 0) {
    //     throw new Error('Invalid price');
    // }
    // const validTenureTypes = ['Freehold', 'Leasehold'];
    // if (!tenureType || typeof tenureType !== 'string' || !validTenureTypes.includes(tenureType)) {
    //     throw new Error('Invalid tenure type');
    // }
    // if (restrictiveCovenants && typeof restrictiveCovenants !== 'string') {
    //     throw new Error('Invalid restrictive covenants');
    // }
    // if (easements && typeof easements !== 'string') {
    //     throw new Error('Invalid easements');
    // }
    // if (mortgageDetails && typeof mortgageDetails !== 'string') {
    //     throw new Error('Invalid mortgage details');
    // }
}

module.exports = {
    validateLandInput,
};
