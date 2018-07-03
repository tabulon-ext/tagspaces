/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces UG (haftungsbeschraenkt)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * @flow
 */

import React, { Component } from 'react';
import Joyride from 'react-joyride';
import i18n from '../services/i18n';

class AppOnboarding extends Component {
  state = {
    run: false,
    continuous: false,
    showProgress: false,
    showSkipButton: false,
  };

  componentDidMount() {
    setTimeout(() => {
      this.setState({
        run: true,
        continuous: true,
        showProgress: true,
        showSkipButton: true,
      });
    }, 1000);
  }

  callback = (data) => {
    const { action, index, type } = data;
  };

  render() {
    const { run } = this.state;
    const { continuous } = this.state;
    const { showProgress } = this.state;
    const { showSkipButton } = this.state;
    const steps = [
      {
        title: i18n.t('welcomeTitle'),
        target: '[data-tid=welcomePanel]',
        content: i18n.t('welcomeContent'),
        placement: 'center',
      },
      {
        title: i18n.t('connectingLocationTitle'),
        target: '[data-tid=createNewLocation]',
        content: i18n.t('createNewLocationContent'),
        placement: 'bottom',
      },
      {
        title: i18n.t('folderNavigatorTitle'),
        target: '[data-tid=locationList]',
        content: i18n.t('showLocationsContent'),
        placement: 'bottom',
      },
      {
        title: i18n.t('taglibraryTitle'),
        target: '[data-tid=tagLibrary]',
        content: i18n.t('tagGroupsContent'),
        placement: 'bottom',
      },
      {
        title: i18n.t('searchTitle'),
        target: '[data-tid=search]',
        content: i18n.t('searchareaContent'),
        placement: 'bottom',
      },
      {
        title: i18n.t('perspectiveTitle'),
        target: '[data-tid=perspectiveManager]',
        content: i18n.t('perspectiveviewContent'),
        placement: 'bottom',
      },
      {
        title: i18n.t('settings'),
        target: '[data-tid=settings]',
        content: i18n.t('settingsdialogContent'),
        placement: 'bottom',
      },
      {
        title: i18n.t('aboutTitle'),
        target: '[data-tid=aboutTagSpaces]',
        content: i18n.t('usefulinformationContent'),
        placement: 'bottom',
      },
      {
        title: i18n.t('enjoyTitle'),
        target: '[data-tid=welcomePanel]',
        content: i18n.t('thankyouContent'),
        placement: 'center',
      },
    ];

    return (
      <Joyride
        steps={steps}
        run={run}
        continuous={continuous}
        showProgress={showProgress}
        showSkipButton={showSkipButton}
        callback={this.callback}
        styles={{
          tooltipHeader: {
            borderBottomColor: '#f04',
          },
        }
        }
      />
    );
  }
}

export default AppOnboarding;
