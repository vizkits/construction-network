/**
 * Close the bidding for a project listing and choose the lowest bid that is below asking price
 * @param {org.acme.project.bidding.CloseBidding} closeBidding - the closeBidding transaction
 * @transaction
 */
function closeBidding(closeBidding) {
    var listing = closeBidding.listing;
    if (listing.state !== 'FOR_BIDDING') {
        throw new Error('Listing is not FOR BIDDING');
    }
    // by default we mark the listing as RESERVE_NOT_MET
    listing.state = 'RESERVE_NOT_MET';
    var lowestOffer = null;
    var buyer = null;
    var seller = null;
    if (listing.offers) {
        // sort the bids by bidPrice
        listing.offers.sort(function(a, b) {
            return (b.bidPrice - a.bidPrice);
        });
        lowestOffer = listing.offers[0];
        if (lowestOffer.bidPrice <= listing.reservePrice) {
            // mark the listing as AWARD
            listing.state = 'AWARD';
            buyer = lowestOffer.member;
            seller = listing.project.owner;
            // update the balance of the seller
            console.log('#### seller balance before: ' + seller.balance);
            seller.balance += lowestOffer.bidPrice;
            console.log('#### seller balance after: ' + seller.balance);
            // update the balance of the buyer
            console.log('#### buyer balance before: ' + buyer.balance);
            buyer.balance -= lowestOffer.bidPrice;
            console.log('#### buyer balance after: ' + buyer.balance);
            // transfer the project to the buyer
            listing.project.owner = buyer;
            // clear the offers
            listing.offers = null;
        }
    }
    return getAssetRegistry('org.acme.project.bidding.Project')
        .then(function(projectRegistry) {
            // save the project
            if (lowestOffer) {
                return projectRegistry.update(listing.project);
            } else {
                return true;
            }
        })
        .then(function() {
            return getAssetRegistry('org.acme.project.bidding.ProjectListing')
        })
        .then(function(projectListingRegistry) {
            // save the project listing
            return projectListingRegistry.update(listing);
        })
        .then(function() {
            return getParticipantRegistry('org.acme.project.bidding.Member')
        })
        .then(function(userRegistry) {
            // save the buyer
            if (listing.state == 'AWARD') {
                return userRegistry.updateAll([buyer, seller]);
            } else {
                return true;
            }
        });
}

/**
 * Make an Offer for a ProjectListing
 * @param {org.acme.project.bidding.Offer} offer - the offer
 * @transaction
 */
function makeOffer(offer) {
    var listing = offer.listing;
    if (listing.state !== 'FOR_BIDDING') {
        throw new Error('Listing is not FOR BIDDING');
    }
    if (listing.offers == null) {
        listing.offers = [];
    }
    listing.offers.push(offer);
    return getAssetRegistry('org.acme.project.bidding.ProjectListing')
        .then(function(projectListingRegistry) {
            // save the project listing
            return projectListingRegistry.update(listing);
        });
}
