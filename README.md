# Alfred - Health Data Processing

This project is part of the larger Alfred project. I wrote about this extensively in my post titled ["Building My Own Butler"](https://lumberjack.so/p/building-my-own-butler). 

As a first step, I needed to get access to all my Apple Health data. This script is designed to capture any data via JSON payloads (I'm using Auto Health Export for that) and create new records in an Airtable base.

## Airtable Webhook Processor

This project is a Node.js application that processes data received from a webhook and interacts with Airtable to manage tables and records. It is built using Express.js and leverages the Airtable API to dynamically create tables and insert records based on incoming data.

## Table of Contents

- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Logging](#logging)
- [Error Handling](#error-handling)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

These instructions will help you set up and run the project on your local machine for development and testing purposes.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js**: You need Node.js installed on your machine. You can download it from [nodejs.org](https://nodejs.org/).
- **npm**: Node.js package manager, which is installed with Node.js.
- **Airtable Account**: You need an Airtable account and an API key to interact with the Airtable API.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Configuration

1. **Environment Variables**: Create a `.env` file in the root directory of your project and add your Airtable API key and other necessary configurations. The `.env` file should look like this:

   ```
   AIRTABLE_API_KEY=your_airtable_api_key
   PORT=3000
   ```

   Ensure that your `.env` file is included in your `.gitignore` to prevent it from being committed to your repository.

2. **Airtable Base ID**: The application uses a specific Airtable base ID, which is hardcoded in the application. You can find this in the `src/App.js` file:

   ```javascript:src/App.js
   startLine: 23
   endLine: 25
   ```

   Replace `'appTV45bv5pf9icd3'` with your actual Airtable base ID.

## Running the Application

To start the application, run the following command:
   ```bash
   npm start
   ```


This will start the server on the port specified in your `.env` file (default is 3000). You can access the webhook endpoint at `http://localhost:3000/webhook`.

## Project Structure

- **src/App.js**: The main application file where the Express server is set up and the webhook endpoint is defined.
- **src/index.js**: The entry point for the React application, though this project primarily focuses on the backend.
- **public/**: Contains static files and the HTML template.
- **src/**: Contains the main application logic and styles.

## Key Features

- **Webhook Endpoint**: The application exposes a `/webhook` endpoint to receive data.
  ```javascript:src/App.js
  startLine: 339
  endLine: 350
  ```

- **Airtable Integration**: The application interacts with Airtable to:
  - Fetch existing tables.
  - Create new tables if they do not exist.
  - Insert new records into tables.
  - Avoid duplicate entries by checking existing records.

- **Dynamic Table Creation**: Tables are created dynamically based on the incoming data's metrics. If a metric is identified as sleep-related, additional fields are added to the table.
  ```javascript:src/App.js
  startLine: 71
  endLine: 140
  ```

- **Logging**: Uses Winston for logging various levels of information, including errors, warnings, and debug information.
  ```javascript:src/App.js
  startLine: 8
  endLine: 19
  ```

## Logging

The application uses Winston for logging. Logs are output to the console and a file named `server.log`. The log level is set to `debug` for detailed information.

## Error Handling

The application includes error handling for network requests and other operations. Errors are logged with detailed information to help with debugging.

## Contributing

Contributions are welcome! Please fork the repository and use a feature branch. Pull requests are reviewed on a regular basis.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
