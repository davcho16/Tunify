/**
 * Manages Spotify authentication and token handling
 */
export const spotifyAuth = {
    // Configuration values
    clientId: "182f6f4353a244fd846d4bfcf29b96ab",
    redirectUri: "http://localhost:3000/callback",
    apiBase: "http://localhost:3001",
    
    // Required scopes for application functionality
    scopes: [
      "user-read-private",
      "user-read-email",
      "user-top-read",
      "playlist-read-private",
    ],
    
    /**
     * Generates the Spotify authorization URL
     * @returns {string} Authorization URL
     */
    getAuthUrl() {
      return `https://accounts.spotify.com/authorize?client_id=${
        this.clientId
      }&response_type=code&redirect_uri=${encodeURIComponent(
        this.redirectUri
      )}&scope=${this.scopes.join("%20")}&show_dialog=true`;
    },
    
    /**
     * Starts the Spotify authorization process
     */
    authorize() {
      // Clear any existing tokens before starting new auth flow
      this.clearTokens();
      window.location.href = this.getAuthUrl();
    },
    
    /**
     * Exchanges authorization code for access and refresh tokens
     * @param {string} code - The authorization code from Spotify
     * @returns {Promise<Object>} Token response object
     */
    async exchangeCode(code) {
      const response = await fetch(`${this.apiBase}/api/spotify-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to exchange code for token");
      }
      
      const data = await response.json();
      this.saveTokens(data);
      return data;
    },
    
    /**
     * Refreshes the access token using the refresh token
     * @returns {Promise<boolean>} Success status
     */
    async refreshToken() {
      const refreshToken = localStorage.getItem("spotify_refresh_token");
      if (!refreshToken) return false;
      
      try {
        const response = await fetch(`${this.apiBase}/api/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to refresh token");
        }
        
        const data = await response.json();
        this.saveTokens(data);
        return true;
      } catch (error) {
        console.error("Token refresh failed:", error);
        this.clearTokens();
        return false;
      }
    },
    
    /**
     * Gets a valid Spotify access token, refreshing if necessary
     * @returns {Promise<string|null>} Access token or null if unavailable
     */
    async getAccessToken() {
      const token = localStorage.getItem("spotify_access_token");
      const expiry = localStorage.getItem("spotify_token_expiry");
      
      // Check if token exists and is still valid
      if (token && expiry && Date.now() < parseInt(expiry)) {
        return token;
      }
      
      // Try to refresh the token
      const success = await this.refreshToken();
      return success ? localStorage.getItem("spotify_access_token") : null;
    },
    
    /**
     * Saves token data to localStorage
     * @param {Object} data - Token response from API
     */
    saveTokens(data) {
      if (data.access_token) {
        localStorage.setItem("spotify_access_token", data.access_token);
        localStorage.setItem("spotify_token_expiry", Date.now() + (data.expires_in * 1000));
      }
      
      if (data.refresh_token) {
        localStorage.setItem("spotify_refresh_token", data.refresh_token);
      }
    },
    
    /**
     * Clears all Spotify tokens from localStorage
     */
    clearTokens() {
      localStorage.removeItem("spotify_access_token");
      localStorage.removeItem("spotify_refresh_token");
      localStorage.removeItem("spotify_token_expiry");
    },
    
    /**
     * Validates if the user has a valid Spotify connection
     * @returns {Promise<Object>} Connection status and profile if connected
     */
    async validateConnection() {
      try {
        const token = await this.getAccessToken();
        if (!token) return { connected: false };
        
        const response = await fetch(`${this.apiBase}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || "Invalid token");
        }
        
        const profile = await response.json();
        return { connected: true, profile };
      } catch (error) {
        console.error("Spotify validation failed:", error);
        if (error.message.includes("Invalid token")) {
          this.clearTokens();
        }
        return { connected: false, error: error.message };
      }
    }
  };
  
  /**
   * Makes an authenticated request to the Spotify API
   * @param {string} endpoint - API endpoint to call
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  export async function callSpotifyAPI(endpoint, options = {}) {
    const token = await spotifyAuth.getAccessToken();
    if (!token) {
      throw new Error("No valid Spotify token available");
    }
    
    const defaultHeaders = {
      Authorization: `Bearer ${token}`
    };
    
    const fetchOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };
    
    const response = await fetch(`${spotifyAuth.apiBase}/api/${endpoint}`, fetchOptions);
    
    if (!response.ok) {
      const errorData = await response.json();
      // Handle token expiration
      if (response.status === 401) {
        spotifyAuth.clearTokens();
        throw new Error("Spotify session expired. Please reconnect your account.");
      }
      throw new Error(errorData.details || errorData.error || "API request failed");
    }
    
    return response.json();
  }