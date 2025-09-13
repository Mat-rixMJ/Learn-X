# TODO: Live Class Scalability and Shareable Link Implementation

## Backend Changes
- [x] Update classes table to include sharable_link field
- [x] Add API endpoint to generate sharable link for a class
- [x] Add API endpoint to join class via sharable link
- [x] Replace WebSocket with Socket.IO for better scalability
- [ ] Implement room-based signaling with load balancing
- [ ] Add Redis for session management and scalability
- [ ] Implement rate limiting for signaling messages
- [ ] Add monitoring and metrics for concurrent users

## Frontend Changes
- [x] Add button to create sharable link in live-class page
- [x] Display sharable link in UI
- [x] Update caption languages to Indian local languages only
- [x] Add delay to captions (3-5 seconds)
- [x] Update caption display logic to show delayed captions
- [x] Implement URL parameter handling for joining via link
- [ ] Add connection pooling for multiple participants
- [ ] Optimize video streaming for large groups
- [ ] Add participant limit handling

## Database Changes
- [x] Add sharable_link column to classes table
- [x] Add migration script if needed
- [ ] Add indexes for performance with large user base

## Scalability Improvements
- [ ] Implement SFU (Selective Forwarding Unit) architecture
- [ ] Add TURN server configuration for NAT traversal
- [ ] Implement connection quality monitoring
- [ ] Add automatic reconnection logic
- [ ] Optimize signaling message handling

## Testing
- [x] Test sharable link creation and joining
- [x] Test captions in Indian languages
- [x] Test caption delay functionality
- [ ] Load testing with 100+ concurrent users
- [ ] Test network resilience and reconnection
- [ ] Performance testing for video streaming
