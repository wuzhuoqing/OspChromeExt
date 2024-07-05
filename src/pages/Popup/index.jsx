"use strict";

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import MPSync from './MPSync';
import StudentImport from './StudentImport';
import './index.css';

const container = document.getElementById('app-container');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(
    <React.StrictMode>
        <Tabs>
            <TabList>
                <Tab>WAStatePTA Sync</Tab>
                <Tab>Bulk Upload User</Tab>
            </TabList>

            <TabPanel>
                <MPSync />
            </TabPanel>
            <TabPanel>
                <StudentImport />
            </TabPanel>
        </Tabs>
    </React.StrictMode>
);