# NewWeb Backend
## Table of Contents
- [Description](#description)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running Locally](#running-locally)
  - [Firebase Storage Setup](#firebase-storage-setup)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
  - [user endpoint](#user-endpoint)
  - [news endpoint](#news-endpoint)
  - [comment endpoint](#comment-endpoint)
## Description
The NewWeb Backend powers the NewWeb platform, providing APIs for user accounts, news articles, and comments. It supports user authentication, news creation and management, and comment interactions
## Tech Stack
- Language: Node.js
- Framework: Express
- Database: PostgreSQL, Firebase Storage
- Authentication: JWT
## Getting Started
### Prerequisites
Make sure the following tools are installed:
- Node.js
- PostgreSQL
- Git
### Installation
1. Clone the repository:
````
git clone https://github.com/tjokabelputra/NewsWebBackend
cd NewsWebBackend
````
2. Install dependencies:
````
npm install
````
### Environment Configuration
Create environment files(```.env.prod```, ```.env.dev```, ```.env.test```) based on the environment

Example ``.env``
````
#PostgreSQL
DB_NAME="your_db_name"
DB_USER="your_username"
DB_PASSWORD="your_db_password"
DB_HOST="your_db_host"
DB_PORT=5432
APP_PORT=3000

#Firebase Storage
STORAGE_BUCKET="your_storage_bucket_name"

#JWT
JWT_SECRET="your_jwt_secret"
````
Make sure your app loads the correct ``.env`` based on ``NODE_ENV``
### Running Locally
Start the development server:
````
npm run dev
````
Start the swagger documentation:
````
npm run swagger
````
The API will be available on ``http://localhost:3000/api-docs``

Start the production
````
npm run start
````
### Firebase Storage Setup
1. Download your Firebase service account JSON from the Firebase console
2. Place it in the root directory of the project
3. Configure Firebase in your application: 
````
const admin = require('firebase-admin');
const serviceAccount = require('./your_service_account.json')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.STORAGE_BUCKET
})
````
## Database Schema
### users Table
| Column      | Type         | Description |
|-------------|--------------| ----------- |
| uid         | uuid         | Primary Key |
| username    | VARCHAR(100) | |
| email       | VARCHAR(100) | Unique |
| password    | TEXT         | |
| role        | Role         | |
| profile_pic | TEXT         | |

### Role Enum
- Admin
- User

### news Table
| Column     | Type        | Description |
|------------|-------------| ----------- |
| newsid     | uuid        | Primary Key |
| createdby  | uuid        | |
| title      | VARCHAR(255) | |
| category   | Category    | |
| banner_url | TEXT        | |
| image_url  | TEXT        | |
| content    | TEXT        | |
| summary    | VARCHAR(255) | |
| createdat  | TIMESTAMP   | |
| views      | INT         | |
| likes      | INT         | |

### Category Enum
- Politik
- Olahraga
- Teknologi
- Ekonomi
- Sains

### comment Table
| Column    | Type  | Description |
|-----------|-------| ----------- |
| commentid | uuid  | Primary Key |
| uid       | uuid  | |
| newsid    | uuid  | |
| comment   | TEXT  | |
| votes     | INT   | |
| createdat | TIMESTAMP | |

### savednews Table
| Column    | Type  | Description |
|-----------|-------| ----------- |
| uid       | uuid  | |
| newsid    | uuid  | |

### likednews Table
| Column      | Type       | Description |
|-------------|------------| ----------- |
| uid         | uuid       | |
| newsid      | uuid       | |
| like_status | likestatus | |

### likedcomment Table
| Column      | Type       | Description |
|-------------|------------| ----------- |
| uid         | uuid       | |
| commentid   | uuid       | |
| like_status | likestatus | |

### likestatus Enum
- Like
- Dislike

## API Endpoints
### user endpoint
| Method | Endpoint                | Description                 | Auth Required | Role       |
|--------|-------------------------|-----------------------------|---------------|------------|
| POST   | user/signup             | Create a new account        | No            | All        |
| POST   | user/login              | Verify and Log in account   | No            | All        |
| POST   | user/changeprofpic/:uid | Update user profile picture | Yes           | User/Admin |

### news endpoint
| Method | Endpoint | Description | Auth Required | Role |
| ------ | -------- | ----------- | ------------- | ---- |
| POST | news/create | Create a new news | Yes | Admin |
| POST | news/save | Save a news | Yes | User/Admin|
| GET | news/home | Get all the news for homepage | No | All |
| GET | news/detail/:newsid | Get a news detail | No | All |
| GET | news/:category | Get all/category news and search | No | All |
| GET | news/saved/:uid | Get all saved news | Yes | User/Admin |
| GET | news/created/:uid | Get all created news | Yes | Admin |
| PUT | news/like | Update the news like status | Yes | User/Admin |
| PUT | news/views/:newsid | Update the news views | No | All |
| DELETE | news/delete/:newsid | Delete a news | Yes | Admin |
| DELETE | news/unsave | Unsave a news | Yes | User/Admin |

### comment endpoint
| Method | Endpoint | Description | Auth Required | Role       |
| ------ | -------- | ----------- | ------------- |------------|
| POST | comment/create | Create a new comment | Yes | User/Admin |
| GET | comment/newsComment | Get a comment in a news | No | All        |
| PUT | comment/like | Update the comment like status | Yes | User/Admin |
| DELETE | comment/delete/:commentid | Delete a comment | Yes | User/Admin |
