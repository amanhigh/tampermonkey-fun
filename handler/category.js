class CategoryHandler {
    handleOrderSetCleanup() {
        // Perform dry run to get potential deletion count
        const dryRunCount = orderSet.dryRunClean();

        //Clean Order Set after unfilter completes
        setTimeout(() => {
            if (dryRunCount < 5) {
                // Auto update if deletion count is less than 5
                const cleanCount = orderSet.clean();
                orderSet.save();
            } else {
                // Prompt user for confirmation if deletion count is 5 or more
                const confirmDeletion = confirm(
                    `Potential Deletions: ${dryRunCount}. Proceed with cleanup?`
                );
                
                if (confirmDeletion) {
                    const cleanCount = orderSet.clean();
                    orderSet.save();
                } else {
                    message("Cleanup aborted by user.", 'red');
                }
            }
        }, 1000);
    }
}