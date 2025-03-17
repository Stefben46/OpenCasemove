# OpenCaseMove

OpenCaseMove is an open-source desktop application designed to help users efficiently move items in and out of Storage Units in **Counter-Strike 2**. It builds upon the foundation of the original **CaseMove** project but remains an independent fork under the **GPL 3.0 license**.

## About OpenCaseMove

- OpenCaseMove originates from **CaseMove** but is now developed separately.
- Any modifications, updates, or changes made here do **not** reflect the work or endorsement of the original author.
- This project ensures continued open-source availability under the **GPL 3.0 license**.

## Features

- **Inventory Management:** View and organize your CS2 inventory.
- **Storage Unit Handling:** Move items in bulk between inventory and storage units.
- **Item Value Estimation:** See inventory and storage unit values from Buff, Skinport, and SCM.
- **Filtering & Sorting:** Quickly search and organize items.
- **Trade-Up Contracts:** Complete trade-up contracts within the app.
- **Multi-Account Support:** Easily switch between multiple Steam accounts.
- **Secure Login Options:** Use a shared secret key instead of an auth code for quick logins.

## How to Use

To use OpenCaseMove, you must build the project from source.

### Prerequisites:
- **Node.js v14.18.2**
- **NPM v7.24.2**

### Installation:
1. Clone the repository:
   ```sh
   git clone https://github.com/Stefben46/OpenCasemove.git
   cd opencasemove
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Build the application:
   ```sh
   npm run build
   ```
4. The setup installer will be available in the `release/build` folder.

## Common Questions

### Can I be VAC banned?
No. OpenCaseMove does **not** interact with your CS2 game client. It only connects to Steam and emulates a CS2 connection, similar to other third-party tools like **Archi Steam Farm**.

### Does OpenCaseMove store my information?
No. OpenCaseMove does not store any sensitive data on your computer, except for the optional refresh token (stored securely using [safeStore](https://www.electronjs.org/docs/latest/api/safe-storage)).

### Why can't I log in using Steam Web authentication?
To move items in and out of storage units, OpenCaseMove requires an active connection with the CS2 game coordinator, which is not possible using web authentication.

## Built Using
- **Node.js v14.18.2**
- **React Electron Boilerplate**
- **TailwindCSS v2**

## License

OpenCaseMove is released under the **GNU General Public License v3.0**.

This means you are free to **use, modify, and distribute** the software under the same license. However, the software comes with **no warranty**. For full details, see the [GPL v3.0 license](https://www.gnu.org/licenses/gpl-3.0.html).

## How to Build

For detailed build instructions, refer to the [Electron React Boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate) documentation.

## Contributing
Contributions are welcome! Feel free to fork the repository, make improvements, and submit a pull request.

---

OpenCaseMove is a community-driven project dedicated to keeping CS2 inventory management **accessible and open-source**.

