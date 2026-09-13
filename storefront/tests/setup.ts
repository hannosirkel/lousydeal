// Existing commerce-flow tests exercise the known-open path. Production still defaults to closed.
process.env.STORE_OPEN ??= "true";
