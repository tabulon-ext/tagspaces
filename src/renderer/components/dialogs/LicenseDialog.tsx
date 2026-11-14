/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces GmbH
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
 */

import AppConfig from '-/AppConfig';
import LicenseContent from '-/LICENSE.txt';
import { printText } from '-/utils/print';
import TsButton from '-/components/TsButton';
import TsDialogActions from '-/components/dialogs/components/TsDialogActions';
import { Pro } from '-/pro';
import { quitApp } from '-/services/utils-io';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  onClose: () => void;
}

// function printElem(elem) {
//   const printWin = window.open('', 'PRINT', 'height=400,width=600');
//   printWin.document.write('<html><head><title>License Agreement</title>');
//   printWin.document.write('</head><body >');
//   printWin.document.write(elem.innerHTML);
//   printWin.document.write('</body></html>');
//   printWin.document.close(); // necessary for IE >= 10
//   printWin.focus(); // necessary for IE >= 10*/
//   printWin.print();
//   printWin.close();
//   return true;
// }

function LicenseDialog(props: Props) {
  const { open, onClose } = props;
  const { t } = useTranslation();

  const licenseText = Pro ? Pro.EULAContent : LicenseContent;

  const theme = useTheme();
  const smallScreen = useMediaQuery(theme.breakpoints.down('md'));
  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === 'escapeKeyDown' || reason === 'backdropClick') return;
        onClose();
      }}
      keepMounted
      fullScreen={smallScreen}
      scroll="paper"
    >
      <DialogTitle>{t('core:license')}</DialogTitle>
      <DialogContent
        // inputRef={ref => {
        //   licenseElement = ref;
        // }}
        sx={{ overflow: 'auto' }}
      >
        <pre style={{ whiteSpace: 'pre-wrap', userSelect: 'text' }}>
          {licenseText}
        </pre>
      </DialogContent>
      <TsDialogActions>
        {/* Print sits on the left (marginRight:auto pushes the rest right) so
            the user can save the license as a PDF via the OS print dialog.
            Desktop/web only — WebView printing is unreliable on mobile. */}
        {!AppConfig.isNativeMobile && (
          <TsButton
            data-tid="printLicenseDialog"
            onClick={() => printText(licenseText, t('core:license'))}
            sx={{ marginRight: 'auto' }}
          >
            {t('core:print')}
          </TsButton>
        )}
        {/* Quit (refuse) only makes sense when acceptance is actually a
            precondition to use — i.e. the Pro EULA. The AGPL doesn't require
            end-user acceptance to run a copy (AGPLv3 §9), so the Lite build
            shows the license for information only, with no accept/refuse gate.
            Native mobile never gets a Quit button either: the store handles the
            EULA and a self-terminating "Quit" violates store review guidelines. */}
        {Pro && !AppConfig.isNativeMobile && (
          <TsButton data-tid="confirmLicenseDialog" onClick={quitApp}>
            {t('core:quit')}
          </TsButton>
        )}
        <TsButton
          data-tid="agreeLicenseDialog"
          onClick={props.onClose}
          variant="contained"
        >
          {/* "I Agree" only for the Pro EULA (real acceptance). For the AGPL
              build it's informational, so just "Close" — the user isn't
              agreeing to anything, only acknowledging they've seen it. */}
          {Pro && !AppConfig.isNativeMobile
            ? t('core:agreeLicense')
            : t('core:closeButton')}
        </TsButton>
      </TsDialogActions>
    </Dialog>
  );
}

export default LicenseDialog;
