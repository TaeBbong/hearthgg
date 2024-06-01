import 'package:get/get.dart';
import '../controllers/home_controller.dart';
import '../repositories/search_repository.dart';
import '../services/main_service.dart';

class InitialBindings extends Bindings {
  @override
  void dependencies() {
    Get.put<MainService>(MainService(), permanent: true);
    Get.put<SearchRepository>(SearchRepository(), permanent: true);
    Get.put<HomeController>(HomeController(), permanent: true);
  }
}
