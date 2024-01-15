'use strict';

const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
const { Timestamp } = require('google-protobuf/google/protobuf/timestamp_pb');
const { validateLandInput } = require('./utils');


class LandRegistry extends Contract {

    async InitLedger(ctx,land) {

        let parsedLand = JSON.parse(land);
        const txId = ctx.stub.getTxID();
        parsedLand.transactionHistory.map((transaction) => transaction.transactionId = txId );
        await ctx.stub.putState(parsedLand.landId, Buffer.from(stringify(sortKeysRecursive(parsedLand))));

    }

    // async InitLedger(ctx, land) {
    //     const iterator = await ctx.stub.getStateByRange('', '');
    //     let result = await iterator.next();
    //     let count = 0;
    //
    //     while (!result.done) {
    //         count++;
    //         const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
    //         let record = JSON.parse(strValue);
    //
    //         // Generate a new transaction ID for each record
    //         const txId = ctx.stub.getTxID();
    //
    //         // Update the transaction ID in each transaction history of the record
    //          ctx.stub.deleteState(record.landId);
    //
    //         // Fetch the next record
    //         result = await iterator.next();
    //     }
    //
    //     return JSON.stringify({ totalCount: count, lastData: result });
    // }


    async CreateLandRecord(ctx, landId, longitude, latitude, owner, address, price, tenureType, restrictiveCovenants, easements, mortgageDetails,propertyDescription) {
        const exists = await this.LandExists(ctx, landId);
        if (exists) {
            throw new Error(`The land ${landId} already exists`);
        }
        validateLandInput({ landId, longitude, latitude, owner, address, price, tenureType, restrictiveCovenants, easements, mortgageDetails });
        const txId = ctx.stub.getTxID();
        const land = {
            landId :landId,
            coordinates: { longitude, latitude },
            owner: owner,
            propertyDescription: propertyDescription,
            address: address,
            price:price,
            tenureType: tenureType,
            restrictiveCovenants: restrictiveCovenants,
            easements: easements,
            mortgageDetails: mortgageDetails,
            transactionHistory: []
        };
        const timestamp = ctx.stub.getTxTimestamp(); // This is a protobuf Timestamp
        const date = new Date((timestamp.seconds * 1000) + (timestamp.nanos / 1000000));
        land.docType = 'land';
        // Add transaction record
        land.transactionHistory.push({
            transactionType: 'CreateLandRecord',
            transactionId: txId,
            newOwner:owner,
            oldOwner:'',
            date: date,
            details: `Land record ${landId} created`
        });
        await ctx.stub.putState(landId, Buffer.from(stringify(sortKeysRecursive(land))));
        return JSON.stringify(land);
    }

    async ReadLandRecord(ctx, landId) {
        const landJSON = await ctx.stub.getState(landId);
        if (!landJSON || landJSON.length === 0) {
            throw new Error(`The land ${landId} does not exist`);
        }
        return landJSON.toString();
    }

    async UpdateLandRecord(ctx, landId, updates) {
        // 'updates' can be an object with fields that need to be updated
        const landString = await this.ReadLandRecord(ctx, landId);
        const land = JSON.parse(landString);
        validateLandInput({ ...land, ...updates });
        // Update fields based on the 'updates' object
        for (const key in updates) {
            if (land.hasOwnProperty(key)) {
                land[key] = updates[key];
            }
        }
        const timestamp = ctx.stub.getTxTimestamp(); // This is a protobuf Timestamp
        const date = new Date((timestamp.seconds * 1000) + (timestamp.nanos / 1000000));
        const txId = ctx.stub.getTxID();
        // Add transaction record
        land.transactionHistory.push({
            transactionType: 'UpdateLandRecord',
            transactionId: txId,
            date: date,
            details: `Land record ${landId} updated`,
            updates: updates
        });

        await ctx.stub.putState(landId, Buffer.from(stringify(sortKeysRecursive(land))));
        return JSON.stringify(land);
    }

    async TransferLand(ctx, landId, newOwner) {
        const landString = await this.ReadLandRecord(ctx, landId);
        if (!landString) {
            throw new Error(`The land ${landId} does not exist`);
        }
        if (!newOwner || typeof newOwner !== 'string') {
            throw new Error('Invalid new owner');
        }
        const land = JSON.parse(landString);
        // Update owner
        const oldOwner = land.owner;
        land.owner = newOwner;
        const timestamp = ctx.stub.getTxTimestamp(); // This is a protobuf Timestamp
        const date = new Date((timestamp.seconds * 1000) + (timestamp.nanos / 1000000));
        const txId = ctx.stub.getTxID();
        // Optionally update transaction history
        const transaction = {
            transactionType: 'Ownership Transfer',
            details: `Land record ${landId} was transferred to new owner ${newOwner}`,
            transactionId: txId,
            date: date,
            oldOwner: oldOwner,
            newOwner: newOwner
        };
        land.transactionHistory.push(transaction);
        await ctx.stub.putState(landId, Buffer.from(stringify(sortKeysRecursive(land))));
        return JSON.stringify({ message: `Ownership of land ${landId} transferred from ${oldOwner} to ${newOwner}` });
    }

    async LandExists(ctx, landId) {
        const landJSON = await ctx.stub.getState(landId);
        return landJSON && landJSON.length > 0;
    }

    // DeleteLand deletes a given land record from the world state.
    async DeleteLand(ctx, landId) {
        const exists = await this.LandExists(ctx, landId);
        if (!exists) {
            throw new Error(`The land ${landId} does not exist`);
        }
        return ctx.stub.deleteState(landId);
    }

    // GetAllLands returns all land records found in the world state.
    async GetAllLands(ctx, pageSize, bookmark, filterParams) {
        const allResults = [];
        const { iterator, metadata } = await ctx.stub.getStateByRangeWithPagination('', '', pageSize, bookmark);
        let result = await iterator.next();
            filterParams = JSON.parse(JSON.parse(filterParams))
            if (Object.keys(filterParams).length > 0  ) {
            while (!result.done) {
                const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
                let record;
                try {
                    record = JSON.parse(strValue);
                } catch (err) {
                    console.log(err);
                    record = strValue;
                }
                // Apply filters
                if (Object.keys(filterParams).length > 0  ) {
                   if( this.matchesFilters(record, filterParams)){
                       allResults.push(record);
                   }
                }
                result = await iterator.next();
            }
        }
        else{
            while (!result.done) {
                const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
                let record;
                try {
                    record = JSON.parse(strValue);
                } catch (err) {
                    console.log(err);
                    record = strValue;
                }
                allResults.push(record);
                result = await iterator.next();
            }
        }
        return JSON.stringify({ records: allResults, bookmark: metadata.bookmark });
    }


    async SellLand(ctx, landId, newOwner, salePrice) {
        const landString = await this.ReadLandRecord(ctx, landId);
        const land = JSON.parse(landString);
        land.owner = newOwner;
        land.price = salePrice;
        const timestamp = ctx.stub.getTxTimestamp(); // This is a protobuf Timestamp
        const date = new Date((timestamp.seconds * 1000) + (timestamp.nanos / 1000000));
        const txId = ctx.stub.getTxID();
        land.transactionHistory.push({
            transactionType: 'SellLand',
            transactionId: txId,
            date: date,
            oldOwner: land.owner,
            newOwner: newOwner,
            salePrice: salePrice
        });
        await ctx.stub.putState(landId, Buffer.from(stringify(sortKeysRecursive(land))));
        return JSON.stringify(land);
    }

    matchesFilters(record, filterParams) {
        let matchesAny = 0
        for (const key in filterParams) {
            if (filterParams.hasOwnProperty(key) && record[key] === filterParams[key]) {
                matchesAny = matchesAny + 1;
            }
        }
        return matchesAny === Object.keys(filterParams).length;

    }


}

module.exports = LandRegistry;


