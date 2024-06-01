import 'package:get/get.dart';
import '../services/main_service.dart';

class InitialBindings extends Bindings {
  @override
  void dependencies() {
    Get.put<MainService>(MainService(), permanent: true);
  }
}
