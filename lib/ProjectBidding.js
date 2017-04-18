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
    var lowestProposal = null;
    var buyer = null;
    var seller = null;
    if (listing.proposals) {
        // sort the bids by bidPrice
        listing.proposals.sort(function(a, b) {
            return (b.bidPrice - a.bidPrice);
        });
        lowestProposal = listing.proposals[0];
        if (lowestProposal.bidPrice <= listing.estimateValue) {
            // mark the listing as AWARD
            listing.state = 'AWARD';
            buyer = lowestProposal.contractor;
            seller = listing.project.owner;
            // update the balance of the seller
            console.log('#### seller balance before: ' + seller.balance);
            seller.balance += lowestProposal.bidPrice;
            console.log('#### seller balance after: ' + seller.balance);
            // update the balance of the buyer
            console.log('#### buyer balance before: ' + buyer.balance);
            buyer.balance -= lowestProposal.bidPrice;
            console.log('#### buyer balance after: ' + buyer.balance);
            // transfer the project to the buyer
            listing.project.owner = buyer;
            // clear the proposals
            listing.proposals = null;
        }
    }
    return getAssetRegistry('org.acme.project.bidding.Project')
        .then(function(projectRegistry) {
            // save the project
            if (lowestProposal) {
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
 * Make a Proposal for a ProjectListing
 * @param {org.acme.project.bidding.Proposal} proposal - the proposal
 * @transaction
 */
function makeProposal(proposal) {
    var listing = proposal.listing;
    if (listing.state !== 'FOR_BIDDING') {
        throw new Error('Listing is not FOR BIDDING');
    }
    if (listing.proposals == null) {
        listing.proposals = [];
    }
    listing.proposals.push(proposal);
    return getAssetRegistry('org.acme.project.bidding.ProjectListing')
        .then(function(projectListingRegistry) {
            // save the project listing
            return projectListingRegistry.update(listing);
        });
}
