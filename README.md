# CLIENT repo - https://github.com/codarbind/queuesockets-frontend.git

# Backend Service for Data Queue Management

This backend service processes incoming data sent from clients at regular intervals, manages data using a message queue, and batches writes to a MySQL database. This architecture helps optimize performance by handling data from thousands of concurrent users more efficiently.

## Features
- **Socket.io** connection to handle continuous data transmission from clients.
- **Bull** message queue to manage and batch the incoming data, reducing direct database write frequency.
- **MySQL** integration for storing data in a relational database.

## Table of Contents
- [Requirements](#requirements)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [How It Works](#how-it-works)
- [Running Tests](#running-tests)

## Requirements

- **Node.js** (v14 or later)
- **MySQL** (database - local or cloud setup)
- **Redis** (for the message queue - local or cloud setup)
- **Socket.io** (for real-time client-server communication)

## Setup Instructions
1. **Clone the repository**:
```bash
git clone https://github.com/codarbind/technical-accessment
cd technical-accessment
```
2. **Install dependencies**:
```bash
npm install
```
3. **Set up MySQL Database**:
* Ensure MySQL is installed and running locally or on a cloud setup.
* Create a new MySQL database (e.g., `data_queue_db`) for the service.
* Run the following SQL command to create the required `messages` table:
```sql
CREATE TABLE messages (
msg_id VARCHAR(50) PRIMARY KEY,
message TEXT,
user_id VARCHAR(50),
timestamp DATETIME
);
```
4. **Set up Redis**:
* Ensure Redis is installed and running locally or set up with a cloud provider .
* Configure Redis to match your environment or cloud setup.
5. **Create and Configure .env File**:
* In the root of your project directory, create a `.env` file with the following environment variables:
```plaintext
# Server Configuration

# Database Configuration
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

# Redis Configuration
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

#client
CLIENT_URL= "http://localhost:5173" #default

#batch

BATCH_SIZE_THRESHOLD=1000 #max size of messages to wait for before processing
PORT=3000 # Specify the port on which the server will run
```
6. **Start server:
```bash
npm run dev
```
This will start the backend service on `http://localhost:3000\`.


# How It Works
## Workflow
1. **Client Connection**: Clients establish a connection with the backend using Socket.io. The client sends JSON data every second, to simulate heavy traffic.
2. **Data Handling and Queueing**: Incoming data is received by the `socketController` , where it's validated and added to a redis queue via Bull.
3. **Batch Processing**:
* The size of the queue is checked every 5 secs to see if the threshold has been hit, and ready for processing.
* When the queue reaches a certain threshold (BATCH_SIZE_THRESHOLD), the service triggers a batch insert into database.
* This reduces the frequency of direct writes to MySQL, improving performance during high traffic.
* Failed jobs are configured to be retried
* Successfully processed jobs are removed from the queue
4. **Database Storage**: The batched data is then inserted into the `messages` table in MySQL.
## Error Handling
* **Queue Failures**: In case of Redis or Bull queue failures, errors are logged, and a retry mechanism is in place.
* **Database Failures**: Database errors are handled with error logging, and failed batch operations are retried.
* When the backend service is down, the client saves the jobs in its buffer till the backend service is up, ensuring that no message is lost despite downtime