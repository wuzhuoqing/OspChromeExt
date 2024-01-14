"use strict";

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import Popup from './Popup';
import StudentImport from './StudentImport';
import './index.css';

const container = document.getElementById('app-container');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(
    <React.StrictMode>
        <Tabs>
            <TabList>
                <Tab>MemberPlanet Sync</Tab>
                <Tab>Bulk Upload User</Tab>
            </TabList>

            <TabPanel>
                <Popup />
            </TabPanel>
            <TabPanel>
                <StudentImport />
            </TabPanel>
        </Tabs>
    </React.StrictMode>
);