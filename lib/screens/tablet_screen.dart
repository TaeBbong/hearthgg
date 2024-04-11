import 'package:flutter/material.dart';

class TabletScreen extends StatefulWidget {
  final bool isDarkMode;
  final Function(bool) toggleTheme;

  const TabletScreen(
      {super.key, required this.isDarkMode, required this.toggleTheme});

  @override
  _TabletScreenState createState() => _TabletScreenState();
}

class _TabletScreenState extends State<TabletScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Flutter Theme Demo for Tablet'),
        actions: [
          Switch(
            value: widget.isDarkMode,
            onChanged: widget.toggleTheme,
            activeColor: Colors.blue,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Image.asset('images/main.png', width: 120)),
                  Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: TextFormField(
                      decoration: InputDecoration(
                        labelText: 'Search',
                        border: OutlineInputBorder(),
                        suffixIcon: Icon(Icons.search),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Footer(),
        ],
      ),
    );
  }
}

class Footer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(20),
      color: Theme.of(context)
          .primaryColor
          .withOpacity(0.1), // Slight primary color tint
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '© 2024 My Website',
            style: TextStyle(
              fontSize: 16,
              color:
                  Theme.of(context).primaryColor, // Use primary color for text
            ),
          ),
        ],
      ),
    );
  }
}
