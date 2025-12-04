# InterviewFeedbackAggregator

A privacy-first encrypted interview feedback aggregation platform that enables interviewers to submit feedback securely. The system collects all submissions to generate a comprehensive candidate profile, reducing individual bias while preserving anonymity.

## Project Background

Traditional interview feedback processes often face challenges such as:

• Bias in feedback: Individual opinions may skew candidate evaluation

• Privacy concerns: Interviewers or candidates may fear identity exposure

• Limited aggregation: Organizations struggle to derive holistic insights

This platform addresses these issues by:

• Allowing encrypted feedback submissions

• Performing privacy-preserving analysis using NLP and FHE techniques

• Aggregating candidate profiles without exposing individual responses

• Enabling anonymous sharing of feedback insights

## Features

### Core Functionality

• Encrypted Feedback Submission: Interviewers submit encrypted feedback on candidates

• Candidate Profile Generation: Aggregated insights and visualizations derived from all feedback

• Feedback Dashboard: View summarized statistics and trends without exposing individual submissions

• Anonymous Sharing: Share insights internally while protecting identities

### Privacy & Security

• Client-side Encryption: Feedback encrypted before submission

• Fully Anonymous: No personal or identifying information is stored

• Immutable Records: Feedback cannot be modified or deleted once submitted

• Secure Analysis: FHE-based NLP processing ensures data remains encrypted during aggregation

## Architecture

### Backend

• Python + NLP Libraries: Text processing, keyword extraction, sentiment analysis

• FHE Engine: Privacy-preserving computation for secure aggregation

• Database: Encrypted storage for feedback submissions

### Frontend

• React + TypeScript: Interactive and responsive user interface

• Dashboard: Visualize candidate profiles, feedback summaries, and analytics

• Search & Filter: Easily find candidate insights by keyword or category

## Technology Stack

### Backend

• Python 3.11: Core logic and NLP processing

• Concrete FHE Library: Privacy-preserving computation

• PostgreSQL / Encrypted Database: Secure feedback storage

### Frontend

• React 18 + TypeScript: Modern interactive frontend

• Tailwind + CSS: Styling and responsive layouts

• Charting Libraries: Visualization of candidate profiles and trends

## Installation

### Prerequisites

• Python 3.11+

• Node.js 18+

• npm / yarn / pnpm package manager

### Setup

```bash
# Backend setup
pip install -r requirements.txt

# Frontend setup
cd frontend
npm install
npm run dev
```

## Usage

• Submit Feedback: Interviewers encrypt and submit candidate evaluations

• View Candidate Profiles: Aggregated summaries and analytics without revealing individual feedback

• Search & Filter: Navigate profiles by keywords, skills, or categories

## Security Features

• Encrypted Submission: Feedback encrypted at source

• Immutable Storage: Records cannot be modified

• Full Anonymity: No identity tracking

• Secure Aggregation: FHE-based computations maintain confidentiality

## Future Enhancements

• Integration of advanced NLP models for richer sentiment and skill analysis

• Multi-language support for global teams

• Mobile-friendly interface and notifications

• AI-driven candidate recommendations

• Organizational analytics dashboard for HR decision-making

Built with ❤️ to ensure secure, unbiased, and anonymous interview feedback aggregation.
