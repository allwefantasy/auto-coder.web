    const fetchServers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/mcp/list');
            // Explicitly type the expected response structure
            const data: ApiResponse<ListResult> = await response.json();

            if (!response.ok) {
                // Use detail field from FastAPI HTTPException if available
                throw new Error(data.detail || 'Server error occurred');
            }

            if (data.status === 'success' && data.raw_result) {
                setBuiltinServers(data.raw_result.builtin_servers || []);
                setExternalServers(data.raw_result.external_servers || []);
                // Optionally show the success message from the backend
                // toast.success(data.message);
            } else {
                // Handle cases where status is 'error' or raw_result is missing
                throw new Error(data.message || 'Failed to fetch servers');
            }

        } catch (err: any) {
            setError(err.message);
            toast.error(`Error fetching servers: ${err.message}`);
            setBuiltinServers([]);
            setExternalServers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRunningServers = async () => {
        try {
            const response = await fetch('/api/mcp/list_running');
             // Explicitly type the expected response structure
            const data: ApiResponse<ListRunningResult> = await response.json();

            if (!response.ok) {
                 // Use detail field from FastAPI HTTPException if available
                throw new Error(data.detail || 'Server error occurred');
            }

            if (data.status === 'success' && data.raw_result) {
                setRunningServers(data.raw_result.servers || []);
                 // Optionally show the success message from the backend
                 // toast.success(data.message);
            } else {
                 // Handle cases where status is 'error' or raw_result is missing
                throw new Error(data.message || 'Failed to fetch running servers');
            }
        } catch (err: any) {
            toast.error(`Error fetching running servers: ${err.message}`);
            setRunningServers([]);
        }
    };

    const handleInstall = async () => {
        if (!installConfig.trim()) {
            toast.warn('Please enter server configuration or name.');
            return;
        }
        setIsLoadingAction(true);
        try {
            const response = await fetch('/api/mcp/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ server_config: installConfig }),
            });
            // Explicitly type the expected response structure
            const data: ApiResponse<InstallResult> = await response.json();

            if (!response.ok) {
                // Use detail field from FastAPI HTTPException if available
                throw new Error(data.detail || 'Server error occurred during installation');
            }

            if (data.status === 'success') {
                toast.success(data.message); // Display backend success message
                fetchServers(); // Refresh lists
                fetchRunningServers();
                setInstallConfig(''); // Clear input field
            } else {
                 // Handle cases where status is 'error'
                throw new Error(data.message || 'Installation failed');
            }

        } catch (error: any) {
            toast.error(`Installation error: ${error.message}`);
        } finally {
            setIsLoadingAction(false);
        }
    };

    const handleRemove = async (serverName: string) => {
        if (!confirm(`Are you sure you want to remove the MCP server "${serverName}"?`)) {
            return;
        }
        setIsLoadingAction(true);
        try {
            const response = await fetch('/api/mcp/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ server_name: serverName }),
            });
             // Explicitly type the expected response structure
            const data: ApiResponse<RemoveResult> = await response.json();

            if (!response.ok) {
                 // Use detail field from FastAPI HTTPException if available
                throw new Error(data.detail || 'Server error occurred during removal');
            }

            if (data.status === 'success') {
                toast.success(data.message); // Display backend success message
                fetchServers(); // Refresh lists
                fetchRunningServers();
            } else {
                // Handle cases where status is 'error'
                throw new Error(data.message || 'Removal failed');
            }
        } catch (error: any) {
            toast.error(`Removal error: ${error.message}`);
        } finally {
            setIsLoadingAction(false);
        }
    };

     const handleRefresh = async (serverName?: string) => {
        setIsLoadingAction(true);
        try {
            const response = await fetch('/api/mcp/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ server_name: serverName || null }),
            });
            // Explicitly type the expected response structure
            const data: ApiResponse<RefreshResult> = await response.json();

             if (!response.ok) {
                 // Use detail field from FastAPI HTTPException if available
                throw new Error(data.detail || 'Server error occurred during refresh');
            }

            if (data.status === 'success') {
                 toast.success(data.message); // Display backend success message
                 fetchRunningServers(); // Refresh running list only
            } else {
                 // Handle cases where status is 'error'
                throw new Error(data.message || 'Refresh failed');
            }
        } catch (error: any) {
            toast.error(`Refresh error: ${error.message}`);
        } finally {
            setIsLoadingAction(false);
        }
    };