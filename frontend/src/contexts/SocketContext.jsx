import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import API_BASE_URL from '../apiConfig';

const SocketContext = createContext(null);

/**
 * Socket.IO Context Provider
 * Manages WebSocket connection with authentication
 * Provides socket instance and connection state to entire app
 */
export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  const initializeSocket = useCallback(() => {
    const publicPaths = ['/', '/register', '/forgot-password', '/reset-password'];
    if (publicPaths.includes(window.location.pathname)) {
      return null;
    }

    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('Socket: No token found, skipping connection');
      return null;
    }

    try {
      console.log('Socket: Initializing connection to', API_BASE_URL);
      
      const newSocket = io(API_BASE_URL, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      newSocket.on('connect', () => {
        setConnected(true);
        setError(null);
        console.log('✓ Socket connected:', newSocket.id);
      });

      newSocket.on('disconnect', (reason) => {
        setConnected(false);
        console.log('✗ Socket disconnected:', reason);
        
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        setError(err.message);
        setConnected(false);
      });

      newSocket.on('error', (err) => {
        console.error('Socket error:', err);
        setError(err.message || 'Socket error occurred');
      });

      // Test ping/pong
      newSocket.on('pong', (data) => {
        console.log('Socket pong received:', data);
      });

      setSocket(newSocket);
      return newSocket;
    } catch (err) {
      console.error('Failed to initialize socket:', err);
      setError(err.message);
      return null;
    }
  }, []);

  useEffect(() => {
    const socketInstance = initializeSocket();

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        console.log('Socket: Cleaning up connection');
        socketInstance.disconnect();
      }
    };
  }, [initializeSocket]);

  // Test ping every 30 seconds to keep connection alive
  useEffect(() => {
    if (!socket || !connected) return;

    const pingInterval = setInterval(() => {
      socket.emit('ping');
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [socket, connected]);

  const value = {
    socket,
    connected,
    error,
    reconnect: initializeSocket,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook to access Socket.IO connection
 * @returns {Object} { socket, connected, error, reconnect }
 */
export function useSocket() {
  const context = useContext(SocketContext);
  
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
}

export default SocketContext;
