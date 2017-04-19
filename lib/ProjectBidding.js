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
    var winner = null;
    var owner = null;
    if (listing.proposals) {
        // sort the bids by bidPrice
        listing.proposals.sort(function(a, b) {
            return (a.bidPrice - b.bidPrice);
        });
        lowestProposal = listing.proposals[0];
        if (lowestProposal.bidPrice <= listing.estimateCost) {
            // mark the listing as AWARD
            listing.state = 'AWARD';
            winner = lowestProposal.contractor;
            owner = listing.project.owner;
            // update the balance of the owner
            console.log('#### owner balance before: ' + owner.balance);
            owner.balance -= lowestProposal.bidPrice;
            console.log('#### owner balance after: ' + owner.balance);
            // update the balance of the winner
            console.log('#### winner balance before: ' + winner.balance);
            winner.balance += lowestProposal.bidPrice;
            console.log('#### winner balance after: ' + winner.balance);
            // assign the project to the winner
            //listing.project.contractor = winner;
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
            return getParticipantRegistry('org.acme.project.bidding.Contractor')
        })
        .then(function(userRegistry) {
            // save the winner
            if (listing.state == 'AWARD') {
                return userRegistry.updateAll([winner]);
            } else {
                return true;
            }
        })
        .then(function() {
            return getParticipantRegistry('org.acme.project.bidding.Architect')
        })
        .then(function(userRegistry) {
            // save the owner
            if (listing.state == 'AWARD') {
                return userRegistry.updateAll([owner]);
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
