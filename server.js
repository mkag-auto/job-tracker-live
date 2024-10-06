// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

mongoose.connect('mongodb://localhost/job_tracker', { useNewUrlParser: true, useUnifiedTopology: true });

const Job = mongoose.model('Job', {
  jobId: String,
  crewId: String,
  status: String,
  location: {
    lat: Number,
    lng: Number
  }
});

const Crew = mongoose.model('Crew', {
  crewId: String,
  name: String,
  completedJobs: Number,
  failedJobs: Number
});

app.use(bodyParser.json());

app.post('/webhook/job-start', async (req, res) => {
  const { jobId, crewId, location } = req.body;
  const job = new Job({ jobId, crewId, status: 'active', location });
  await job.save();
  res.sendStatus(200);
});

app.post('/webhook/job-complete', async (req, res) => {
  const { jobId, status } = req.body;
  const job = await Job.findOne({ jobId });
  if (job) {
    const crew = await Crew.findOne({ crewId: job.crewId });
    if (crew) {
      if (status === 'completed') {
        crew.completedJobs++;
      } else {
        crew.failedJobs++;
      }
      await crew.save();
    }
    await Job.deleteOne({ jobId });
  }
  res.sendStatus(200);
});

app.get('/api/active-jobs', async (req, res) => {
  const jobs = await Job.find({ status: 'active' });
  res.json(jobs);
});

app.get('/api/scoreboard', async (req, res) => {
  const crews = await Crew.find();
  res.json(crews);
});

app.listen(3000, () => console.log('Server running on port 3000'));

// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';

function App() {
  const [activeJobs, setActiveJobs] = useState([]);
  const [scoreboard, setScoreboard] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const jobsResponse = await axios.get('/api/active-jobs');
      setActiveJobs(jobsResponse.data);
      const scoreboardResponse = await axios.get('/api/scoreboard');
      setScoreboard(scoreboardResponse.data);
    };
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <MapContainer center={[0, 0]} zoom={2} style={{ height: '400px', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {activeJobs.map(job => (
          <Marker key={job.jobId} position={[job.location.lat, job.location.lng]}>
            <Popup>
              Job ID: {job.jobId}<br />
              Crew ID: {job.crewId}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <h2>Scoreboard</h2>
      <table>
        <thead>
          <tr>
            <th>Crew Name</th>
            <th>Completed Jobs</th>
            <th>Failed Jobs</th>
          </tr>
        </thead>
        <tbody>
          {scoreboard.map(crew => (
            <tr key={crew.crewId}>
              <td>{crew.name}</td>
              <td>{crew.completedJobs}</td>
              <td>{crew.failedJobs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;