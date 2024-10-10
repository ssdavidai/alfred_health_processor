require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const winston = require('winston');
const { DateTime } = require('luxon');

// Configure winston logger
const logger = winston.createLogger({
  level: 'debug', // Set to 'debug' for more detailed logs
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'server.log' })
  ],
});


// Airtable configuration
const AIRTABLE_BASE_ID = 'appTV45bv5pf9icd3';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY; // Read from environment variable
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// Headers for Airtable API requests
const headers = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};


// Log the API key for debugging
logger.debug('Airtable API Key is set.');

// Check if API key is set
if (!AIRTABLE_API_KEY) {
  logger.error('Airtable API Key is not set. Please check your .env file.');
  process.exit(1); // Exit the application if the API key is missing
}

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Function to get existing tables in the base
async function getExistingTables() {
  logger.info('Fetching existing tables from Airtable...');
  try {
    const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
    logger.debug(`GET request to URL: ${url}`);
    const response = await axios.get(url, { headers });
    logger.debug(`Response from Airtable: ${JSON.stringify(response.data)}`);
    const tables = response.data.tables;
    const tableNames = tables.map((table) => table.name);
    logger.info(`Existing tables retrieved: ${JSON.stringify(tableNames)}`);
    return tableNames;
  } catch (error) {
    logger.error('Failed to retrieve existing tables from Airtable.');
    if (error.response) {
      logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    } else {
      logger.error(`Error: ${error.message}`);
    }
    return [];
  }
}

// Function to create a new table
async function createTable(tableName, isSleepMetric = false) {
  logger.info(`Attempting to create table "${tableName}" in Airtable...`);
  try {
    const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
    logger.debug(`POST request to URL: ${url}`);
    const fields = [
      {
        name: 'Date',
        type: 'dateTime',
        options: {
          timeZone: 'utc',
          dateFormat: { name: 'iso' },
          timeFormat: { name: '24hour' }
        },
      },
      { 
        name: 'Quantity', 
        type: 'number',
        options: {
          precision: 8 // Specify the precision for the number field
        }
      },
      { name: 'Units', type: 'singleLineText' },
      { name: 'Source', type: 'singleLineText' },
      { 
        name: 'Min', 
        type: 'number',
        options: {
          precision: 8
        }
      },
      { 
        name: 'Max', 
        type: 'number',
        options: {
          precision: 8
        }
      },
      { 
        name: 'Avg', 
        type: 'number',
        options: {
          precision: 8
        }
      },
    ];

    if (isSleepMetric) {
      logger.info(`Metric "${tableName}" is identified as sleep-related. Adding sleep-specific fields.`);
      const sleepFields = [
        { name: 'Asleep', type: 'number', options: { precision: 8 } },
        { name: 'InBed', type: 'number', options: { precision: 8 } },
        { name: 'Awake', type: 'number', options: { precision: 8 } },
        { name: 'Core', type: 'number', options: { precision: 8 } },
        { name: 'Deep', type: 'number', options: { precision: 8 } },
        { name: 'Rem', type: 'number', options: { precision: 8 } },
        {
          name: 'Sleep Start',
          type: 'dateTime',
          options: {
            timeZone: 'utc',
            dateFormat: { name: 'iso' },
            timeFormat: { name: '24hour' }
          },
        },
        {
          name: 'Sleep End',
          type: 'dateTime',
          options: {
            timeZone: 'utc',
            dateFormat: { name: 'iso' },
            timeFormat: { name: '24hour' }
          },
        },
        {
          name: 'InBed Start',
          type: 'dateTime',
          options: {
            timeZone: 'utc',
            dateFormat: { name: 'iso' },
            timeFormat: { name: '24hour' }
          },
        },
        {
          name: 'InBed End',
          type: 'dateTime',
          options: {
            timeZone: 'utc',
            dateFormat: { name: 'iso' },
            timeFormat: { name: '24hour' }
          },
        },
      ];
      fields.push(...sleepFields);
    }

    const payload = {
      name: tableName,
      fields,
    };

    logger.debug(`Payload for table creation: ${JSON.stringify(payload)}`);
    const response = await axios.post(url, payload, { headers });
    logger.info(`Table "${tableName}" created successfully. Response: ${JSON.stringify(response.data)}`);
  } catch (error) {
    logger.error(`Failed to create table "${tableName}".`);
    if (error.response) {
      logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    } else {
      logger.error(`Error: ${error.message}`);
    }
  }
}

// Function to get existing dates in a table
async function getExistingDates(tableName) {
  logger.info(`Fetching existing dates from table "${tableName}"...`);
  try {
    const existingDates = new Set();
    let url = `${AIRTABLE_API_URL}/${encodeURIComponent(tableName)}`;
    let params = {
      fields: ['Date'],
      pageSize: 100,
    };
    let hasMore = true;
    let iteration = 1;

    while (hasMore) {
      logger.info(`Fetching page ${iteration} of records from table "${tableName}"...`);
      logger.debug(`GET request to URL: ${url} with params: ${JSON.stringify(params)}`);
      const response = await axios.get(url, { headers, params });
      logger.debug(`Response from Airtable: ${JSON.stringify(response.data)}`);
      const records = response.data.records;
      logger.info(`Received ${records.length} records from page ${iteration}.`);

      records.forEach((record) => {
        const dateValue = record.fields.Date;
        if (dateValue) {
          existingDates.add(dateValue);
        }
      });

      if (response.data.offset) {
        params.offset = response.data.offset;
        logger.info('More records to fetch, continuing to next page...');
      } else {
        hasMore = false;
        logger.info('No more records to fetch.');
      }
      iteration++;
    }

    logger.info(`Total existing dates fetched from table "${tableName}": ${existingDates.size}`);
    return existingDates;
  } catch (error) {
    logger.error(`Failed to fetch existing records from table "${tableName}".`);
    if (error.response) {
      logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    } else {
      logger.error(`Error: ${error.message}`);
    }
    return new Set();
  }
}

// Function to create records in a table
async function createRecords(tableName, records) {
  logger.info(`Adding ${records.length} new record(s) to table "${tableName}"...`);
  try {
    const url = `${AIRTABLE_API_URL}/${encodeURIComponent(tableName)}`;
    const batchSize = 10;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const payload = { records: batch };
      logger.debug(`Payload for record creation: ${JSON.stringify(payload)}`);
      const response = await axios.post(url, payload, { headers });
      logger.info(`Batch added successfully. Response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logger.error(`Failed to add records to table "${tableName}".`);
    if (error.response) {
      logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    } else {
      logger.error(`Error: ${error.message}`);
    }
  }
}

// Function to determine if a metric is sleep-related
function isSleepMetric(metricName) {
  const sleepMetrics = [
    'sleep_analysis_asleep_in_bed',
    'apple_sleeping_wrist_temperature',
    'resting_heart_rate',
  ];
  const isSleep = sleepMetrics.includes(metricName);
  logger.info(`Metric "${metricName}" is ${isSleep ? '' : 'not '}identified as sleep-related.`);
  return isSleep;
}

// Main function to process webhook data
async function processWebhookData(data) {
  logger.info('Starting processWebhookData function');
  if (!data || !Array.isArray(data.metrics)) {
    logger.error('Invalid data format: expected data.metrics to be an array.');
    return;
  }

  const metricsData = data.metrics;

  logger.info('Starting data processing...');
  try {
    let existingTables = await getExistingTables();

    for (const metric of metricsData) {
      logger.info(`Processing metric: ${JSON.stringify(metric)}`);
      const tableName = metric.name;
      const units = metric.units;
      const metricData = metric.data || [];

      if (!tableName) {
        logger.warn('Metric name is missing. Skipping metric.');
        continue;
      }

      // Check if table exists; create if it doesn't
      if (!existingTables.includes(tableName)) {
        logger.info(`Table "${tableName}" does not exist. Creating table.`);
        await createTable(tableName, isSleepMetric(tableName));
        existingTables.push(tableName);
      } else {
        logger.info(`Table "${tableName}" exists.`);
      }

      // Get existing dates to check for duplicates
      const existingDates = await getExistingDates(tableName);

      // Prepare records
      const recordsToAdd = [];
      for (const record of metricData) {
        logger.info(`Processing record: ${JSON.stringify(record)}`);
        const dateValue = record.date;
        if (!dateValue) {
          logger.warn('Record is missing "date". Skipping record.');
          continue;
        }

        // Convert dateValue to ISO 8601 format
        const isoDate = convertToISODate(dateValue);
        if (!isoDate) {
          logger.warn(`Invalid date format for date "${dateValue}". Skipping record.`);
          continue;
        }

        // Log existing dates for debugging
        logger.debug(`Existing dates: ${Array.from(existingDates)}`);
        logger.debug(`Checking for duplicate date: ${isoDate}`);

        // Check for duplicate date and time
        if (existingDates.has(isoDate)) {
          logger.warn(`Record with date "${isoDate}" already exists. Skipping record.`);
          continue;
        }

        const fields = {
          Date: isoDate,
          Quantity: record.qty,
          Units: units,
          Source: record.source || '',
        };

        // Include Min, Max, Avg if present
        for (const stat of ['min', 'max', 'avg']) {
          if (record[stat] !== undefined) {
            fields[stat.charAt(0).toUpperCase() + stat.slice(1)] = record[stat];
            logger.info(`Added field "${stat}": ${record[stat]}`);
          }
        }

        // Include sleep-specific fields if applicable
        if (isSleepMetric(tableName)) {
          const sleepFields = [
            'asleep', 'inbed', 'awake', 'core',
            'deep', 'rem', 'sleep_start', 'sleep_end',
            'inbed_start', 'inbed_end',
          ];

          for (const sleepField of sleepFields) {
            if (record[sleepField] !== undefined) {
              const fieldName = sleepField
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              fields[fieldName] = record[sleepField];
              logger.info(`Added sleep field "${fieldName}": ${record[sleepField]}`);
            }
          }
        }
        recordsToAdd.push({ fields });
        logger.info(`Record prepared for addition: ${JSON.stringify(fields)}`);
      }

      // Create records in Airtable
      if (recordsToAdd.length > 0) {
        logger.info(`Adding ${recordsToAdd.length} new record(s) to table "${tableName}".`);
        await createRecords(tableName, recordsToAdd);
      } else {
        logger.info(`No new records to add for metric "${tableName}".`);
      }
    }

    logger.info('Data processing completed successfully.');
  } catch (error) {
    logger.error(`An error occurred during data processing: ${error.message}`);
    logger.error(error.stack);
  }
}

// Function to convert date to ISO 8601 format
function convertToISODate(dateStr) {
  // Check if the date string is missing a time component
  if (!dateStr.includes(' ')) {
    dateStr += ' 00:00:00 +0200'; // Add default time and timezone
  }

  // Parse the date string using Luxon
  const dt = DateTime.fromFormat(dateStr, 'yyyy-MM-dd HH:mm:ss ZZZ', { setZone: true });
  if (!dt.isValid) {
    return null;
  }
  // Return ISO 8601 formatted string
  return dt.toISO();
}

// Set up the webhook endpoint
app.post('/webhook', async (req, res) => {
  logger.info('Received data from webhook:');
  logger.info(JSON.stringify(req.body, null, 2));

  const data = req.body.data; // Ensure this is correctly accessing the data

  // Process the webhook data
  await processWebhookData(data);

  // Send a response back to acknowledge receipt
  res.status(200).send({ status: 'success' });
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Webhook endpoint is available at http://localhost:${PORT}/webhook`);
});